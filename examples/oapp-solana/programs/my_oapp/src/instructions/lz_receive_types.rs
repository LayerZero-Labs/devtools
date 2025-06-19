use crate::*;
use oapp::endpoint_cpi::{get_accounts_for_clear, LzAccount};
use oapp::{endpoint::ID as ENDPOINT_ID, LzReceiveParams};

/// `lz_receive_types` is queried off-chain by the Executor before calling
/// `lz_receive`. It must return **every** account that will be touched by the
/// actual `lz_receive` instruction as well as the accounts required by
/// `Endpoint::clear`.
///
/// The return order must match exactly what `lz_receive` expects or the
/// cross-program invocation will fail.
#[derive(Accounts)]
pub struct LzReceiveTypes<'info> {
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
}

impl LzReceiveTypes<'_> {
    pub fn apply(
        ctx: &Context<LzReceiveTypes>,
        params: &LzReceiveParams,
    ) -> Result<Vec<LzAccount>> {
        // 1. The store PDA is always the first account and is mutable.  If your
        // program derives the store PDA with additional seeds, ensure the same
        // seeds are used when providing the store account.
        let store = ctx.accounts.store.key();

        // 2. The peer PDA for the remote chain needs to be retrieved, for later verification of the `params.sender`.
        let peer_seeds = [PEER_SEED, &store.to_bytes(), &params.src_eid.to_be_bytes()];
        let (peer, _) = Pubkey::find_program_address(&peer_seeds, ctx.program_id);

        // Accounts used directly by `lz_receive`
        let mut accounts = vec![
            // store (mutable)
            LzAccount { pubkey: store, is_signer: false, is_writable: true },
            // peer (read-only)
            LzAccount { pubkey: peer, is_signer: false, is_writable: false }
        ];

        // Append the additional accounts required for `Endpoint::clear`
        let accounts_for_clear = get_accounts_for_clear(
            ENDPOINT_ID,
            &store,
            params.src_eid,
            &params.sender,
            params.nonce,
        );
        accounts.extend(accounts_for_clear);

        Ok(accounts)
    }
}
