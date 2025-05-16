use crate::*;

#[derive(Accounts)]
#[instruction(params: NextNonceParams)]
pub struct NextNonce<'info> {
    #[account(
        seeds = [STORE_SEED],
        bump = store.bump,
        constraint = params.receiver == store.key()
    )]
    pub store: Account<'info, Store>,
    #[account(
        seeds = [NONCE_SEED, &params.receiver.as_ref(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl NextNonce<'_> {
    pub fn apply(ctx: &Context<NextNonce>, _params: &NextNonceParams) -> Result<u64> {
        if ctx.accounts.store.ordered_nonce {
            return Ok(ctx.accounts.nonce_account.max_received_nonce + 1);
        }
        return Ok(0); // path nonce starts from 1. if 0 it means that there is no specific nonce enforcement
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct NextNonceParams {
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub receiver: Pubkey,
}
