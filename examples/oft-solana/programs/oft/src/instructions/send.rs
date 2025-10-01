use crate::*;
use anchor_spl::token_interface::{
    self, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};
use oapp::endpoint::{instructions::SendParams as EndpointSendParams, MessagingReceipt};

/// Send instruction context: used to process an OFT (Omnichain Fungible Token) send operation.
/// 
/// This instruction handles two types of OFT transfers:
/// - **Adapter type:** Tokens are transferred from the source account to the escrow account,
///   and the total value locked (TVL) is increased.
/// - **Native type:** Tokens are burned from the source account (minus fee),
///   and any fee is transferred to the escrow.
/// 
/// After processing the token movement, a message is sent to the endpoint via a CPI call.
/// The CPI call returns a MessagingReceipt which is used to emit an event.
#[event_cpi]
#[derive(Accounts)]
#[instruction(params: SendParams)]
pub struct Send<'info> {
    // The signer who initiates the send operation.
    pub signer: Signer<'info>,

    // Peer configuration account, derived from the peer seed, the OFTStore key, and destination endpoint ID.
    // This account provides fee parameters and holds the peer's registered address.
    #[account(
        mut,
        seeds = [
            PEER_SEED,
            oft_store.key().as_ref(),
            &params.dst_eid.to_be_bytes()
        ],
        bump = peer.bump
    )]
    pub peer: Account<'info, PeerConfig>,

    // The OFTStore account holds the configuration, state, and fee settings for the OFT.
    // It is derived using a seed combining a constant (OFT_SEED) and the token escrow account.
    #[account(
        mut,
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump
    )]
    pub oft_store: Account<'info, OFTStore>,

    // The token source account from which tokens are sent.
    // This account is owned by the signer and must have sufficient balance.
    #[account(
        mut,
        token::authority = signer,
        token::mint = token_mint,
        token::token_program = token_program
    )]
    pub token_source: InterfaceAccount<'info, TokenAccount>,

    // The token escrow account controlled by the OFTStore.
    // For Adapter type OFTs, tokens are transferred into this account.
    #[account(
        mut,
        address = oft_store.token_escrow,
        token::authority = oft_store.key(),
        token::mint = token_mint,
        token::token_program = token_program
    )]
    pub token_escrow: InterfaceAccount<'info, TokenAccount>,

    // The token mint account for the OFT. Its address must match the one stored in the OFTStore.
    #[account(
        mut,
        address = oft_store.token_mint,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    // The token program interface (SPL Token interface).
    pub token_program: Interface<'info, TokenInterface>,
}

impl Send<'_> {
    /// Applies the Send instruction.
    ///
    /// Steps performed:
    /// 1. Ensure that the OFTStore is not paused.
    /// 2. Compute effective amounts using `compute_fee_and_adjust_amount`:
    ///    - `amount_sent_ld`: the initial amount (in local decimals) before fees.
    ///    - `amount_received_ld`: the final amount after fees.
    ///    - `oft_fee_ld`: the fee deducted.
    /// 3. Verify that the `amount_received_ld` meets the minimum required amount.
    /// 4. Apply rate limiter logic on the peer account:
    ///    - Consume outbound rate limiter.
    ///    - Refill inbound rate limiter.
    /// 5. Depending on the OFT type:
    ///    - **Adapter Type:** Transfer the entire `amount_sent_ld` from the token source to the token escrow,
    ///      and increase the TVL.
    ///    - **Native Type:** Burn the tokens from the token source (amount minus fee) and transfer the fee to escrow.
    /// 6. Send a message to the endpoint using a CPI call. The message includes:
    ///    - The destination endpoint ID.
    ///    - The receiver (from the peer configuration).
    ///    - The encoded message with amount (converted from local to shared decimals), destination, and additional options.
    /// 7. Emit an event with the messaging receipt details.
    ///
    /// Returns:
    /// - A tuple containing the MessagingReceipt (from the endpoint CPI) and an OFTReceipt summarizing the amounts.
    pub fn apply(
        ctx: &mut Context<Send>,
        params: &SendParams,
    ) -> Result<(MessagingReceipt, OFTReceipt)> {
        // Ensure the OFTStore is active (not paused).
        require!(!ctx.accounts.oft_store.paused, OFTError::Paused);

        // Compute fee and adjust the amounts:
        // - amount_sent_ld: The original amount before fees.
        // - amount_received_ld: The final amount to be credited after fees.
        // - oft_fee_ld: The fee deducted in local decimals.
        let (amount_sent_ld, amount_received_ld, oft_fee_ld) = compute_fee_and_adjust_amount(
            params.amount_ld,
            &ctx.accounts.oft_store,
            &ctx.accounts.token_mint,
            ctx.accounts.peer.fee_bps,
        )?;
        // Verify that the final amount meets the minimum requirement.
        require!(amount_received_ld >= params.min_amount_ld, OFTError::SlippageExceeded);

        // Apply rate limiting:
        // Consume outbound rate limiter from the peer (reducing available outbound quota).
        if let Some(rate_limiter) = ctx.accounts.peer.outbound_rate_limiter.as_mut() {
            rate_limiter.try_consume(amount_received_ld)?;
        }
        // Refill inbound rate limiter for future transfers.
        if let Some(rate_limiter) = ctx.accounts.peer.inbound_rate_limiter.as_mut() {
            rate_limiter.refill(amount_received_ld)?;
        }

        // Process token movement based on the OFT type.
        if ctx.accounts.oft_store.oft_type == OFTType::Adapter {
            // **Adapter Type:**
            // Transfer tokens from the token source to the escrow.
            // Increase the TVL (total value locked) by the received amount.
            ctx.accounts.oft_store.tvl_ld += amount_received_ld;
            token_interface::transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.token_source.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        to: ctx.accounts.token_escrow.to_account_info(),
                        authority: ctx.accounts.signer.to_account_info(),
                    },
                ),
                amount_sent_ld, // Transfer the entire amount sent (including fee, if any).
                ctx.accounts.token_mint.decimals,
            )?;
        } else {
            // **Native Type:**
            // Burn tokens from the token source, excluding the fee.
            token_interface::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.token_mint.to_account_info(),
                        from: ctx.accounts.token_source.to_account_info(),
                        authority: ctx.accounts.signer.to_account_info(),
                    },
                ),
                amount_sent_ld - oft_fee_ld,
            )?;

            // Transfer the fee amount from the token source to the escrow.
            if oft_fee_ld > 0 {
                token_interface::transfer_checked(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        TransferChecked {
                            from: ctx.accounts.token_source.to_account_info(),
                            mint: ctx.accounts.token_mint.to_account_info(),
                            to: ctx.accounts.token_escrow.to_account_info(),
                            authority: ctx.accounts.signer.to_account_info(),
                        },
                    ),
                    oft_fee_ld,
                    ctx.accounts.token_mint.decimals,
                )?;
            }
        }

        // Send the cross-chain message via the endpoint CPI:
        // Verify that the sender (OFTStore) is correctly provided in the remaining accounts.
        require!(
            ctx.accounts.oft_store.key() == ctx.remaining_accounts[1].key(),
            OFTError::InvalidSender
        );
        // Convert the received amount from local decimals to shared decimals.
        let amount_sd = ctx.accounts.oft_store.ld2sd(amount_received_ld);
        // Call the endpoint's send method with the assembled parameters.
        let msg_receipt = oapp::endpoint_cpi::send(
            ctx.accounts.oft_store.endpoint_program,
            ctx.accounts.oft_store.key(), // Sender: the OFTStore
            ctx.remaining_accounts,       // Additional accounts required for the CPI call.
            // The seeds used for signing the PDA.
            &[OFT_SEED, ctx.accounts.token_escrow.key().as_ref(), &[ctx.accounts.oft_store.bump]],
            EndpointSendParams {
                dst_eid: params.dst_eid,
                receiver: ctx.accounts.peer.peer_address,
                // Encode the message with the destination, amount in shared decimals,
                // sender's key, and any optional compose message.
                message: msg_codec::encode(
                    params.to,
                    amount_sd,
                    ctx.accounts.signer.key(),
                    &params.compose_msg,
                ),
                // Options combined from enforced options in the peer and provided parameters.
                options: ctx
                    .accounts
                    .peer
                    .enforced_options
                    .combine_options(&params.compose_msg, &params.options)?,
                // Fees specified for the native chain and for the LayerZero token.
                native_fee: params.native_fee,
                lz_token_fee: params.lz_token_fee,
            },
        )?;

        // Emit an event to log the send operation.
        // The event includes a globally unique identifier (guid), the destination endpoint,
        // the source token account, and both the sent and received amounts.
        emit_cpi!(OFTSent {
            guid: msg_receipt.guid,
            dst_eid: params.dst_eid,
            from: ctx.accounts.token_source.key(),
            amount_sent_ld,
            amount_received_ld
        });

        // Return the messaging receipt and a receipt summarizing the token amounts.
        Ok((msg_receipt, OFTReceipt { amount_sent_ld, amount_received_ld }))
    }
}

/// Parameters for the Send instruction.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SendParams {
    pub dst_eid: u32,         // Destination endpoint ID.
    pub to: [u8; 32],         // Destination address.
    pub amount_ld: u64,       // Amount to send (in local decimals).
    pub min_amount_ld: u64,   // Minimum amount expected after fee deductions.
    pub options: Vec<u8>,     // Additional options for the send operation.
    pub compose_msg: Option<Vec<u8>>, // Optional compose message for further processing.
    pub native_fee: u64,      // Fee for native operations.
    pub lz_token_fee: u64,    // Fee paid in LayerZero tokens.
}
