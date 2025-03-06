use crate::*;
use oapp::endpoint::{instructions::QuoteParams, MessagingFee};

use anchor_spl::{
    token_2022::spl_token_2022::{
        extension::{
            transfer_fee::{TransferFee, TransferFeeConfig},
            BaseStateWithExtensions, StateWithExtensions,
        },
        state::Mint as MintState,
    },
    token_interface::Mint,
};

/// Accounts required for the QuoteSend instruction.
///
/// This instruction is used to query the messaging fee for sending an OFT (Omnichain Fungible Token)
/// to a destination endpoint. It computes the effective amount that would be received after applying any fees,
/// and then calls the endpoint CPI to return the MessagingFee details.
///
/// The fee calculation is performed using the configuration stored in the OFTStore and token mint,
/// while the peer account provides the fee basis points for the destination endpoint.
#[derive(Accounts)]
#[instruction(params: QuoteSendParams)]
pub struct QuoteSend<'info> {
    // The OFTStore holds the configuration, state, and fee settings for the OFT.
    // It is a PDA derived using a constant seed and the token escrow account.
    #[account(
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump
    )]
    pub oft_store: Account<'info, OFTStore>,

    // The PeerConfig account is derived using the peer seed, the OFTStore key, and the destination endpoint ID.
    // It stores fee parameters (e.g., fee basis points) and the peer address.
    #[account(
        seeds = [
            PEER_SEED,
            oft_store.key().as_ref(),
            &params.dst_eid.to_be_bytes()
        ],
        bump = peer.bump
    )]
    pub peer: Account<'info, PeerConfig>,

    // The token mint for the OFT. Its address must match the one stored in the OFTStore.
    #[account(address = oft_store.token_mint)]
    pub token_mint: InterfaceAccount<'info, Mint>,
}

impl QuoteSend<'_> {
    /// Applies the QuoteSend instruction.
    ///
    /// This function performs the following steps:
    /// 1. Checks that the OFT is active (not paused).
    /// 2. Computes the adjusted amounts using `compute_fee_and_adjust_amount`, which returns:
    ///    - `amount_sent_ld`: the original amount (in local decimals) before fees,
    ///    - `amount_received_ld`: the final amount after fees,
    ///    - `oft_fee_ld`: the calculated fee.
    /// 3. Verifies that the `amount_received_ld` is at least the minimum amount required.
    /// 4. Calls the endpoint CPI `quote` method to obtain the messaging fee for the send operation.
    ///
    /// @dev The computed fee and adjusted amount are used to construct the message that is sent to the endpoint.
    ///      This instruction mirrors the functionality on EVM for parity, though fee details might be handled differently.
    pub fn apply(ctx: &Context<QuoteSend>, params: &QuoteSendParams) -> Result<MessagingFee> {
        // Ensure that the OFT is not paused.
        require!(!ctx.accounts.oft_store.paused, OFTError::Paused);

        // Compute the effective amounts:
        // - We do not use the 'amount_sent_ld' here, only 'amount_received_ld' is needed.
        // - 'compute_fee_and_adjust_amount' applies the fee settings from the OFTStore and peer.
        let (_, amount_received_ld, _) = compute_fee_and_adjust_amount(
            params.amount_ld,
            &ctx.accounts.oft_store,
            &ctx.accounts.token_mint,
            ctx.accounts.peer.fee_bps,
        )?;
        // Ensure that the received amount meets the minimum required amount.
        require!(amount_received_ld >= params.min_amount_ld, OFTError::SlippageExceeded);

        // Call the endpoint CPI to get the messaging fee for the send operation.
        // The QuoteParams struct contains:
        // - sender: The OFTStore key (acting as the sender).
        // - dst_eid: The destination endpoint ID.
        // - receiver: The peer's registered address.
        // - message: The encoded message, which includes the destination address, the amount (post-fee), a default value,
        //            and any compose message if provided.
        // - pay_in_lz_token: Flag indicating whether the fee is paid in the LayerZero token.
        // - options: Combined options derived from the enforced options in the peer account and the provided options.
        oapp::endpoint_cpi::quote(
            ctx.accounts.oft_store.endpoint_program, // The endpoint program for cross-chain messaging.
            ctx.remaining_accounts,                    // Additional accounts required for the CPI call.
            QuoteParams {
                sender: ctx.accounts.oft_store.key(),
                dst_eid: params.dst_eid,
                receiver: ctx.accounts.peer.peer_address,
                message: msg_codec::encode(
                    params.to,
                    amount_received_ld,
                    Pubkey::default(),  // Placeholder for additional parameters (unused here).
                    &params.compose_msg,
                ),
                pay_in_lz_token: params.pay_in_lz_token,
                options: ctx
                    .accounts
                    .peer
                    .enforced_options
                    .combine_options(&params.compose_msg, &params.options)?,
            },
        )
    }
}

/// Computes fee details and adjusted token amounts based on the OFT configuration and token mint.
///
/// Depending on whether the OFT is of type Adapter or Native, the fee calculation differs:
/// - **Adapter Type:** Applies post-fee calculations and removes any "dust" from the amount.
/// - **Native Type:** Assumes no transfer fee is applied.
///
/// Returns a tuple:
/// - `amount_sent_ld`: The original amount (in local decimals) before fees.
/// - `amount_received_ld`: The final amount after deducting fees.
/// - `oft_fee_ld`: The fee amount in local decimals.
pub fn compute_fee_and_adjust_amount(
    amount_ld: u64,
    oft_store: &OFTStore,
    token_mint: &InterfaceAccount<Mint>,
    fee_bps: Option<u16>,
) -> Result<(u64, u64, u64)> {
    let (amount_sent_ld, amount_received_ld, oft_fee_ld) = if OFTType::Adapter == oft_store.oft_type {
        // For Adapter type, first compute the post-fee amount and remove dust.
        let mut amount_received_ld =
            oft_store.remove_dust(get_post_fee_amount_ld(token_mint, amount_ld)?);
        // Calculate the pre-fee amount necessary to yield the post-fee amount.
        let amount_sent_ld = get_pre_fee_amount_ld(token_mint, amount_received_ld)?;

        // Calculate the fee and remove dust.
        let oft_fee_ld = oft_store.remove_dust(calculate_fee(
            amount_received_ld,
            oft_store.default_fee_bps,
            fee_bps,
        ));
        // Deduct the fee from the received amount.
        amount_received_ld -= oft_fee_ld;
        (amount_sent_ld, amount_received_ld, oft_fee_ld)
    } else {
        // For Native OFT, no transfer fee is applied.
        let amount_sent_ld = oft_store.remove_dust(amount_ld);
        let oft_fee_ld = oft_store.remove_dust(calculate_fee(
            amount_sent_ld,
            oft_store.default_fee_bps,
            fee_bps,
        ));
        let amount_received_ld = amount_sent_ld - oft_fee_ld;
        (amount_sent_ld, amount_received_ld, oft_fee_ld)
    };
    Ok((amount_sent_ld, amount_received_ld, oft_fee_ld))
}

/// Calculates the fee amount based on the pre-fee amount, default fee basis points, and an optional fee override.
///
/// Returns the fee in local decimals.
fn calculate_fee(pre_fee_amount: u64, default_fee_bps: u16, fee_bps: Option<u16>) -> u64 {
    let final_fee_bps = if let Some(bps) = fee_bps { bps as u128 } else { default_fee_bps as u128 };
    if final_fee_bps == 0 || pre_fee_amount == 0 {
        0
    } else {
        // Fee is computed as: pre_fee_amount * final_fee_bps / ONE_IN_BASIS_POINTS
        let fee = (pre_fee_amount as u128) * final_fee_bps;
        (fee / ONE_IN_BASIS_POINTS) as u64
    }
}

/// Retrieves the post-fee amount for a given token mint and amount, using the transfer fee configuration.
/// If the token mint has a TransferFeeConfig extension, it calculates the post-fee amount;
/// otherwise, it returns the original amount.
pub fn get_post_fee_amount_ld(token_mint: &InterfaceAccount<Mint>, amount_ld: u64) -> Result<u64> {
    let token_mint_info = token_mint.to_account_info();
    let token_mint_data = token_mint_info.try_borrow_data()?;
    let token_mint_ext = StateWithExtensions::<MintState>::unpack(&token_mint_data)?;
    let post_amount_ld =
        if let Ok(transfer_fee_config) = token_mint_ext.get_extension::<TransferFeeConfig>() {
            transfer_fee_config
                .get_epoch_fee(Clock::get()?.epoch)
                .calculate_post_fee_amount(amount_ld)
                .ok_or(ProgramError::InvalidArgument)?
        } else {
            amount_ld
        };
    Ok(post_amount_ld)
}

/// Calculates the pre-fee amount required to yield a given post-fee amount for a token mint.
/// This function does *not* de-dust any inputs or outputs.
fn get_pre_fee_amount_ld(token_mint: &InterfaceAccount<Mint>, amount_ld: u64) -> Result<u64> {
    let token_mint_info = token_mint.to_account_info();
    let token_mint_data = token_mint_info.try_borrow_data()?;
    let token_mint_ext = StateWithExtensions::<MintState>::unpack(&token_mint_data)?;
    let pre_amount_ld =
        if let Ok(transfer_fee) = token_mint_ext.get_extension::<TransferFeeConfig>() {
            calculate_pre_fee_amount(transfer_fee.get_epoch_fee(Clock::get()?.epoch), amount_ld)
                .ok_or(ProgramError::InvalidArgument)?
        } else {
            amount_ld
        };
    Ok(pre_amount_ld)
}

// DO NOT CHANGE THIS CODE!!!
// Bug reported on token2022: https://github.com/solana-labs/solana-program-library/pull/6704/files
// This code is copied over as a fix has not been published.
pub const MAX_FEE_BASIS_POINTS: u16 = 10_000;
const ONE_IN_BASIS_POINTS: u128 = MAX_FEE_BASIS_POINTS as u128;

/// Calculates the pre-fee amount from the post-fee amount given a TransferFee configuration.
/// Returns `None` if the calculation would overflow.
fn calculate_pre_fee_amount(fee: &TransferFee, post_fee_amount: u64) -> Option<u64> {
    let maximum_fee = u64::from(fee.maximum_fee);
    let transfer_fee_basis_points = u16::from(fee.transfer_fee_basis_points) as u128;
    match (transfer_fee_basis_points, post_fee_amount) {
        // No fee: return the post_fee_amount directly.
        (0, _) => Some(post_fee_amount),
        // If post_fee_amount is zero, return zero.
        (_, 0) => Some(0),
        // 100% fee: cap the pre_fee_amount at maximum_fee plus post_fee_amount.
        (ONE_IN_BASIS_POINTS, _) => maximum_fee.checked_add(post_fee_amount),
        _ => {
            let numerator = (post_fee_amount as u128).checked_mul(ONE_IN_BASIS_POINTS)?;
            let denominator = ONE_IN_BASIS_POINTS.checked_sub(transfer_fee_basis_points)?;
            let raw_pre_fee_amount = ceil_div(numerator, denominator)?;

            if raw_pre_fee_amount.checked_sub(post_fee_amount as u128)? >= maximum_fee as u128 {
                post_fee_amount.checked_add(maximum_fee)
            } else {
                // Return None if the calculated pre_fee_amount overflows.
                u64::try_from(raw_pre_fee_amount).ok()
            }
        },
    }
}

/// Helper function to perform ceiling division.
fn ceil_div(numerator: u128, denominator: u128) -> Option<u128> {
    numerator.checked_add(denominator)?.checked_sub(1)?.checked_div(denominator)
}

/// Parameters for the QuoteSend instruction.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct QuoteSendParams {
    pub dst_eid: u32,
    pub to: [u8; 32],
    pub amount_ld: u64,
    pub min_amount_ld: u64,
    pub options: Vec<u8>,
    pub compose_msg: Option<Vec<u8>>,
    pub pay_in_lz_token: bool,
}
