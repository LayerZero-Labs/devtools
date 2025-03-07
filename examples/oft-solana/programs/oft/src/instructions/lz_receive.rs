use crate::*;
use anchor_lang::solana_program;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::spl_token_2022::{self, solana_program::program_option::COption},
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use oapp::endpoint::{
    cpi::accounts::Clear,
    instructions::{ClearParams, SendComposeParams},
    ConstructCPIContext,
};

/// Instruction: LzReceive
/// This instruction handles incoming cross-chain messages and performs one of two actions:
/// 1. For OFT Adapters: Unlock tokens from escrow (transfer from token escrow to recipient).
/// 2. For vanilla OFTs: Mint new tokens into the recipient's associated token account.
/// It also clears the inbound payload, applies rate limiting, and optionally composes a follow-up message.
#[event_cpi]
#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceive<'info> {
    // The account paying for the transaction fees.
    #[account(mut)]
    pub payer: Signer<'info>,

    // Peer configuration account, derived using a seed based on the OFTStore and source endpoint ID.
    // This account also validates the sender of the cross-chain message.
    #[account(
        mut,
        seeds = [
            PEER_SEED,
            oft_store.key().as_ref(),
            &params.src_eid.to_be_bytes()
        ],
        bump = peer.bump,
        constraint = peer.peer_address == params.sender @OFTError::InvalidSender
    )]
    pub peer: Account<'info, PeerConfig>,

    // The OFTStore account which holds configuration and state for the OFT.
    // This account is used as a PDA (Program Derived Address) for various authority checks.
    #[account(
        mut,
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump
    )]
    pub oft_store: Account<'info, OFTStore>,

    // Token escrow account, which holds tokens in escrow.
    // The authority of this account is the OFTStore and its address is derived from it.
    #[account(
        mut,
        address = oft_store.token_escrow,
        token::authority = oft_store,
        token::mint = token_mint,
        token::token_program = token_program
    )]
    pub token_escrow: InterfaceAccount<'info, TokenAccount>,
    
    // The destination wallet that will receive the token.
    // This is checked against the decoded destination from the incoming message.
    /// CHECK: This account is not read or written by this program,
    /// but its address must match the expected destination derived from the message.
    #[account(address = Pubkey::from(msg_codec::send_to(&params.message)) @OFTError::InvalidTokenDest)]
    pub to_address: AccountInfo<'info>,

    // Associated token account for the destination wallet.
    // It is created if it does not exist, using the token mint and to_address as the owner.
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = to_address,
        associated_token::token_program = token_program
    )]
    pub token_dest: InterfaceAccount<'info, TokenAccount>,

    // The mint account for the SPL token.
    // Its address must match the token mint specified in the OFTStore.
    #[account(
        mut,
        address = oft_store.token_mint,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    // Mint authority account for the SPL token.
    // Only used in the native mint scenario.
    // The mint authority can be:
    //   1. A multisig account (e.g., a SPL-token multisig with the OFTStore as one signer and a 1-of-N quorum), or
    //   2. The OFTStore itself.
    #[account(constraint = token_mint.mint_authority == COption::Some(mint_authority.key()) @OFTError::InvalidMintAuthority)]
    pub mint_authority: Option<AccountInfo<'info>>,

    // The token program interface (SPL Token interface).
    pub token_program: Interface<'info, TokenInterface>,

    // The associated token program used for creating associated token accounts.
    pub associated_token_program: Program<'info, AssociatedToken>,

    // The system program.
    pub system_program: Program<'info, System>,
}

impl LzReceive<'_> {
    pub fn apply(ctx: &mut Context<LzReceive>, params: &LzReceiveParams) -> Result<()> {
        // Ensure that the OFTStore is not paused.
        require!(!ctx.accounts.oft_store.paused, OFTError::Paused);

        // Derive seeds for signing PDAs: [OFT_SEED, token_escrow address, bump]
        let oft_store_seed = ctx.accounts.token_escrow.key();
        let seeds: &[&[u8]] = &[OFT_SEED, oft_store_seed.as_ref(), &[ctx.accounts.oft_store.bump]];

        // --- Clear Payload ---
        // Validate and clear the cross-chain message payload using the 'clear' CPI call.
        // This ensures the message has not been tampered with.
        let accounts_for_clear = &ctx.remaining_accounts[0..Clear::MIN_ACCOUNTS_LEN];
        let _ = oapp::endpoint_cpi::clear(
            ctx.accounts.oft_store.endpoint_program,
            ctx.accounts.oft_store.key(),
            accounts_for_clear,
            seeds,
            ClearParams {
                receiver: ctx.accounts.oft_store.key(),
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
                guid: params.guid,
                message: params.message.clone(),
            },
        )?;

        // --- Amount Conversion ---
        // Extract the amount (in shared decimals) from the message and convert it to local decimals.
        let amount_sd = msg_codec::amount_sd(&params.message);
        let mut amount_received_ld = ctx.accounts.oft_store.sd2ld(amount_sd);

        // --- Rate Limiting ---
        // Consume inbound rate limiter: ensure the amount does not exceed limits.
        if let Some(rate_limiter) = ctx.accounts.peer.inbound_rate_limiter.as_mut() {
            rate_limiter.try_consume(amount_received_ld)?;
        }
        // Refill outbound rate limiter: adjust for future outbound transfers.
        if let Some(rate_limiter) = ctx.accounts.peer.outbound_rate_limiter.as_mut() {
            rate_limiter.refill(amount_received_ld)?;
        }

        // --- Process Based on OFT Type ---
        if ctx.accounts.oft_store.oft_type == OFTType::Adapter {
            // For Adapter type OFTs: Unlock tokens from escrow.
            // Decrease total value locked by the transferred amount.
            ctx.accounts.oft_store.tvl_ld -= amount_received_ld;
            token_interface::transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.token_escrow.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: ctx.accounts.token_dest.to_account_info(),
                        // OFTStore is used as the authority to transfer tokens out of escrow.
                        authority: ctx.accounts.oft_store.to_account_info(),
                    },
                )
                .with_signer(&[&seeds]),
                amount_received_ld,
                ctx.accounts.token_mint.decimals,
            )?;

            // Adjust the transferred amount by applying any post-transfer fees.
            amount_received_ld =
                get_post_fee_amount_ld(&ctx.accounts.token_mint, amount_received_ld)?
        } else if let Some(mint_authority) = &ctx.accounts.mint_authority {
            // For Native OFTs: Mint new tokens.
            // Build the mint_to instruction using the SPL Token 2022 library.
            let ix = spl_token_2022::instruction::mint_to(
                ctx.accounts.token_program.key,
                &ctx.accounts.token_mint.key(),
                &ctx.accounts.token_dest.key(),
                mint_authority.key,
                // Include the OFTStore as an additional signer (e.g., in a multisig scenario).
                &[&ctx.accounts.oft_store.key()],
                amount_received_ld,
            )?;
            // Invoke the mint instruction with the appropriate PDA signer.
            solana_program::program::invoke_signed(
                &ix,
                &[
                    ctx.accounts.token_dest.to_account_info(),
                    ctx.accounts.token_mint.to_account_info(),
                    mint_authority.to_account_info(),
                    ctx.accounts.oft_store.to_account_info(),
                ],
                &[&seeds],
            )?;
        } else {
            // If no valid mint authority is provided, return an error.
            return Err(OFTError::InvalidMintAuthority.into());
        }

        // --- Compose Outbound Message ---
        // If the incoming message contains additional data to compose a follow-up message,
        // encode and send it via the endpoint CPI call.
        if let Some(message) = msg_codec::compose_msg(&params.message) {
            oapp::endpoint_cpi::send_compose(
                ctx.accounts.oft_store.endpoint_program,
                ctx.accounts.oft_store.key(),
                &ctx.remaining_accounts[Clear::MIN_ACCOUNTS_LEN..],
                seeds,
                SendComposeParams {
                    to: ctx.accounts.to_address.key(),
                    guid: params.guid,
                    index: 0, // For default OFT implementation there is only 1 compose msg per lzReceive, thus index is always 0.
                    message: compose_msg_codec::encode(
                        params.nonce,
                        params.src_eid,
                        amount_received_ld,
                        &message,
                    ),
                },
            )?;
        }

        // --- Emit Event ---
        // Emit an event indicating the receipt and processing of the OFT message.
        emit_cpi!(OFTReceived {
            guid: params.guid,
            src_eid: params.src_eid,
            to: ctx.accounts.to_address.key(),
            amount_received_ld,
        });
        Ok(())
    }
}
