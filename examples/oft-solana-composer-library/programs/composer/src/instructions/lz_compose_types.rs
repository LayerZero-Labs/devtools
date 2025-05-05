// instructions/lz_compose_types.rs
use crate::*;
use anchor_lang::prelude::*;
use oapp::endpoint_cpi::{get_accounts_for_clear_compose, LzAccount};
use oapp::LzComposeParams;
use spl_memo::id as memo_program_id;

const COMPOSER_SEED: &[u8] = b"Composer";

#[derive(Accounts)]
pub struct LzComposeTypes<'info> {
    /// Only the Composer PDA—holds every Pubkey we need.
    #[account(
        seeds = [COMPOSER_SEED, &composer.oft_pda.to_bytes()],
        bump   = composer.bump,
    )]
    pub composer: Account<'info, Composer>,
}

impl<'info> LzComposeTypes<'info> {
    pub fn apply(
        ctx: &Context<LzComposeTypes>,
        params: &LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        let c = &ctx.accounts.composer;
        let mut accounts = Vec::with_capacity(1   // payer
            + 2   // SPL token programs
            + 2   // Raydium config & pool
            + 2   // user ATAs
            + 2   // pool vaults
            + 5   // observation + tick arrays
            + 1   // memo
            + 2   // vault mints
            + 6); // clear_compose

        // 0) placeholder for the executor/payer
        accounts.push(LzAccount {
            pubkey: Pubkey::default(),
            is_signer: true,
            is_writable: true,
        });

        // 1) SPL token programs
        accounts.push(LzAccount {
            pubkey: c.token_program,
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: c.token_program_2022,
            is_signer: false,
            is_writable: false,
        });

        // 2) Raydium config + pool state
        accounts.push(LzAccount {
            pubkey: c.amm_config,
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: c.pool_state,
            is_signer: false,
            is_writable: true,
        });

        // 3) User token ATAs (input A, output B)
        accounts.push(LzAccount {
            pubkey: c.input_token_account,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: c.output_token_account,
            is_signer: false,
            is_writable: true,
        });

        // 4) Pool vaults (input A, output B)
        accounts.push(LzAccount {
            pubkey: c.input_vault,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: c.output_vault,
            is_signer: false,
            is_writable: true,
        });

        // 5) Observation and tick‐array accounts
        accounts.push(LzAccount {
            pubkey: c.observation_state,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: c.tick_bitmap,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: c.tick_array_lower,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: c.tick_array_current,
            is_signer: false,
            is_writable: true,
        });
        accounts.push(LzAccount {
            pubkey: c.tick_array_upper,
            is_signer: false,
            is_writable: true,
        });

        // 6) SPL Memo program
        accounts.push(LzAccount {
            pubkey: memo_program_id(),
            is_signer: false,
            is_writable: false,
        });

        // 7) Vault mints
        accounts.push(LzAccount {
            pubkey: c.input_vault_mint,
            is_signer: false,
            is_writable: false,
        });
        accounts.push(LzAccount {
            pubkey: c.output_vault_mint,
            is_signer: false,
            is_writable: false,
        });

        // --- LayerZero clear_compose (replay protection) ---
        let mut extra = get_accounts_for_clear_compose(
            c.endpoint_program,      // endpoint program ID
            &params.from,            // OFT sender
            &c.endpoint_pda,         // endpoint PDA
            &params.guid,            // message GUID
            params.index,            // sequence index
            &params.message,         // raw payload
        );
        accounts.append(&mut extra);

        Ok(accounts)
    }
}
