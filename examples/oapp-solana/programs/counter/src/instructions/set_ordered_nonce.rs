use crate::*;

#[derive(Accounts)]
#[instruction(params: SetOrderedNonceParams)]
pub struct SetOrderedNonce<'info> {
    #[account(address = store.admin)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
}

impl SetOrderedNonce<'_> {
    pub fn apply(ctx: &mut Context<SetOrderedNonce>, params: &SetOrderedNonceParams) -> Result<()> {
        ctx.accounts.store.ordered_nonce = params.ordered_nonce;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetOrderedNonceParams {
    pub ordered_nonce: bool,
}
