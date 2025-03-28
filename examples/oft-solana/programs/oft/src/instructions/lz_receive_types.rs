use crate::*;
use anchor_lang::solana_program;
use anchor_spl::{
    associated_token::{get_associated_token_address_with_program_id, ID as ASSOCIATED_TOKEN_ID},
    token_2022::spl_token_2022::solana_program::program_option::COption,
    token_interface::Mint,
};
use oapp::endpoint_cpi::LzAccount;

/// Accounts required to derive the list of LzAccounts for processing a cross-chain message.
/// 
/// The LzReceiveTypes struct provides minimal accounts necessary for the endpoint configuration.
/// Specifically, it includes the OFTStore (which holds OFT configuration and state) and the token mint.
/// 
/// ### Expected Accounts Mapping (for downstream CPI processing):
/// - **Account 0:** Payer (executor) - not explicitly provided here but mapped later.
/// - **Account 1:** Peer account (derived PDA from peer seed, oft_store, and src_eid)
/// - **Account 2:** OFTStore account (holds configuration for the OFT)
/// - **Account 3:** Token escrow account (associated with the OFTStore)
/// - **Account 4:** Destination wallet (decoded from the cross-chain message)
/// - **Account 5:** Destination token account (associated token address for the destination)
/// - **Account 6:** Token mint account (SPL token mint for the OFT)
/// - **Account 7:** Mint authority (optional; for native minting operations)
/// - **Account 8:** Token program (owner of the token mint account)
/// - **Account 9:** Associated token program (for associated token account creation)
/// - **Account 10:** System program (required for system operations)
/// - **Account 11:** Event authority account (PDA used for event emission)
/// - **Account 12:** This program’s ID (the current program)
/// - **Remaining Accounts:** Accounts for "clear" and "compose" CPIs.
/// 
#[derive(Accounts)]
pub struct LzReceiveTypes<'info> {
    // The OFTStore account holds the configuration, rate-limiters, and state for the OFT.
    #[account(
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump
    )]
    pub oft_store: Account<'info, OFTStore>,

    // The token mint for the OFT. Its address should match that stored in the OFTStore.
    #[account(address = oft_store.token_mint)]
    pub token_mint: InterfaceAccount<'info, Mint>,
}

impl LzReceiveTypes<'_> {
    /// Derives and returns a vector of `LzAccount` entries that are used to process a cross-chain message.
    ///
    /// This function assembles a specific ordering of accounts required by the endpoint CPI calls.
    /// It includes both fixed accounts (derived from the provided context) and dynamic accounts
    /// (computed based on the incoming message parameters).
    ///
    /// # Parameters
    /// - `ctx`: The context containing the OFTStore and token mint accounts.
    /// - `params`: The parameters extracted from the incoming cross-chain message.
    ///
    /// # Returns
    /// A vector of `LzAccount` structures representing the ordered accounts required for the message.
    ///
    pub fn apply(
        ctx: &Context<LzReceiveTypes>,
        params: &LzReceiveParams,
    ) -> Result<Vec<LzAccount>> {
        // Derive the peer PDA using the OFTStore key and the source endpoint ID (src_eid)
        let (peer, _) = Pubkey::find_program_address(
            &[PEER_SEED, ctx.accounts.oft_store.key().as_ref(), &params.src_eid.to_be_bytes()],
            ctx.program_id,
        );

        // --- Build Base Accounts (Indices 0 to 3) ---
        // These accounts are required for initial endpoint operations:
        // 0. Placeholder for payer/executor (set as default here)
        // 1. The derived peer account that validates the sender.
        // 2. The OFTStore account.
        // 3. The token escrow account (associated with the OFTStore).
        let mut accounts = vec![
            LzAccount { pubkey: Pubkey::default(), is_signer: true, is_writable: true }, // Account 0: Payer (placeholder)
            LzAccount { pubkey: peer, is_signer: false, is_writable: true },             // Account 1: Peer PDA
            LzAccount { pubkey: ctx.accounts.oft_store.key(), is_signer: false, is_writable: true }, // Account 2: OFTStore
            LzAccount {
                pubkey: ctx.accounts.oft_store.token_escrow.key(),
                is_signer: false,
                is_writable: true,
            }, // Account 3: Token escrow account
        ];

        // --- Build Associated Accounts (Indices 4 to 9) ---
        // 4. Destination wallet address, decoded from the message.
        // 5. Associated token account for the destination wallet (will be created if missing).
        // 6. Token mint account.
        // 7. Mint authority account (if available, otherwise fallback).
        // 8. Token program ID (owner of the token mint).
        // 9. Associated token program ID.
        let to_address = Pubkey::from(msg_codec::send_to(&params.message));
        let token_program = ctx.accounts.token_mint.to_account_info().owner;
        let token_dest = get_associated_token_address_with_program_id(
            &to_address,
            &ctx.accounts.oft_store.token_mint,
            token_program,
        );
        let mint_authority =
            if let COption::Some(mint_authority) = ctx.accounts.token_mint.mint_authority {
                mint_authority
            } else {
                // Fallback to current program ID if no mint authority is set in the token mint.
                ctx.program_id.key()
            };
        accounts.extend_from_slice(&[
            LzAccount { pubkey: to_address, is_signer: false, is_writable: false }, // Account 4: Destination wallet
            LzAccount { pubkey: token_dest, is_signer: false, is_writable: true },  // Account 5: Destination token account
            LzAccount {
                pubkey: ctx.accounts.token_mint.key(),
                is_signer: false,
                is_writable: true,
            }, // Account 6: Token mint
            LzAccount { pubkey: mint_authority, is_signer: false, is_writable: false }, // Account 7: Mint authority
            LzAccount { pubkey: *token_program, is_signer: false, is_writable: false }, // Account 8: Token program
            LzAccount { pubkey: ASSOCIATED_TOKEN_ID, is_signer: false, is_writable: false }, // Account 9: Associated token program
        ]);

        // --- Build System and Event Accounts (Indices 10 to 12) ---
        // 10. The Solana system program.
        // 11. The event authority account (a PDA derived using the event seed).
        // 12. The current program's ID.
        let (event_authority_account, _) =
            Pubkey::find_program_address(&[oapp::endpoint_cpi::EVENT_SEED], &ctx.program_id);
        accounts.extend_from_slice(&[
            LzAccount {
                pubkey: solana_program::system_program::ID,
                is_signer: false,
                is_writable: false,
            }, // Account 10: System program
            LzAccount { pubkey: event_authority_account, is_signer: false, is_writable: false }, // Account 11: Event authority
            LzAccount { pubkey: ctx.program_id.key(), is_signer: false, is_writable: false }, // Account 12: Current program
        ]);

        // --- Append Accounts for the 'Clear' Operation ---
        // Retrieve the accounts required for clearing the inbound payload.
        let endpoint_program = ctx.accounts.oft_store.endpoint_program;
        let accounts_for_clear = oapp::endpoint_cpi::get_accounts_for_clear(
            endpoint_program,
            &ctx.accounts.oft_store.key(),
            params.src_eid,
            &params.sender,
            params.nonce,
        );
        accounts.extend(accounts_for_clear);

        // --- Append Accounts for the 'Compose' Operation (if applicable) ---
        // If there is a compose message included in the incoming payload, append the necessary accounts.
        if let Some(message) = msg_codec::compose_msg(&params.message) {
            let amount_sd = msg_codec::amount_sd(&params.message);
            let amount_ld = ctx.accounts.oft_store.sd2ld(amount_sd);
            let amount_received_ld = if ctx.accounts.oft_store.oft_type == OFTType::Native {
                amount_ld
            } else {
                // For non-native (adapter) types, adjust the amount for post-transfer fees.
                get_post_fee_amount_ld(&ctx.accounts.token_mint, amount_ld)?
            };

            let accounts_for_composing = oapp::endpoint_cpi::get_accounts_for_send_compose(
                endpoint_program,
                &ctx.accounts.oft_store.key(),
                &to_address,
                &params.guid,
                0, // Only one compose message per operation.
                &compose_msg_codec::encode(
                    params.nonce,
                    params.src_eid,
                    amount_received_ld,
                    &message,
                ),
            );
            accounts.extend(accounts_for_composing);
        }

        // Return the complete list of LzAccounts to be used for further CPI calls.
        Ok(accounts)
    }
}