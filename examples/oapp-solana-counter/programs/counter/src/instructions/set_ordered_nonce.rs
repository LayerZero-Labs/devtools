use crate::*;

#[derive(Accounts)]
#[instruction(params: SetOrderedNonceParams)]
pub struct SetOrderedNonce<'info> {
    #[account(address = count.admin)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
}

impl SetOrderedNonce<'_> {
    pub fn apply(ctx: &mut Context<SetOrderedNonce>, params: &SetOrderedNonceParams) -> Result<()> {
        ctx.accounts.count.ordered_nonce = params.ordered_nonce;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetOrderedNonceParams {
    pub ordered_nonce: bool,
}
