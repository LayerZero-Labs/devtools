use crate::*;

use anchor_lang::solana_program;
use oapp::{
    common::{
        compact_accounts_with_alts, AccountMetaRef, AddressLocator, EXECUTION_CONTEXT_VERSION_1,
    },
    lz_receive_types_v2::{
        Instruction, LzReceiveTypesV2Result,
    },
    LzReceiveParams,
};


#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceiveTypesV2<'info> {
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
    // Note: include more accounts here if you had done so in the previous steps
}

impl LzReceiveTypesV2<'_> {
    /// Returns the execution plan for lz_receive with a minimal account set.
    pub fn apply(
        ctx: &Context<LzReceiveTypesV2>,
        params: &LzReceiveParams,
    ) -> Result<LzReceiveTypesV2Result> {
        // 1. Store PDA (writable) – matches LzReceive's `store` account
        let store_key = ctx.accounts.store.key();

        // 2. Derive peer PDA using store key + src_eid to match LzReceive
        let peer_seeds = [PEER_SEED, store_key.as_ref(), &params.src_eid.to_be_bytes()];
        let (peer, _) = Pubkey::find_program_address(&peer_seeds, ctx.program_id);

        // Event authority used for logging
        let (event_authority_account, _) =
            Pubkey::find_program_address(&[oapp::endpoint_cpi::EVENT_SEED], &ctx.program_id);

        let accounts = vec![
            // payer
            AccountMetaRef { pubkey: AddressLocator::Payer, is_writable: true },
            // store (writable)
            AccountMetaRef { pubkey: store_key.into(), is_writable: true },
            // peer
            AccountMetaRef { pubkey: peer.into(), is_writable: false },
            // event authority account - used for event logging
            AccountMetaRef { pubkey: event_authority_account.into(), is_writable: false },
            // system program
            AccountMetaRef {
                pubkey: solana_program::system_program::ID.into(),
                is_writable: false,
            },
            // program id - the program that is executing this instruction
            AccountMetaRef { pubkey: crate::ID.into(), is_writable: false },
        ];

        // Return the execution plan (no clear/compose helper accounts)
        Ok(LzReceiveTypesV2Result {
            context_version: EXECUTION_CONTEXT_VERSION_1,
            alts: ctx.remaining_accounts.iter().map(|alt| alt.key()).collect(),
            instructions: vec![
                Instruction::LzReceive {
                    // In this example, ALTs are passed in via remaining_accounts
                    // This decision allows for flexibility in terms of passing in any number of ALTs without needing to change the accounts struct
                    // However, if you need stronger schema guarantees and require only a single ALT, you may opt to have it passed in explicitly via ctx.accounts.alt (or similar)
                    accounts: compact_accounts_with_alts(&ctx.remaining_accounts, accounts)?,
                },
            ],
        })
    }
}