use crate::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: SetRemoteParams)]
pub struct SetRemote<'info> {
    #[account(mut, address = count.admin)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = Remote::SIZE,
        seeds = [REMOTE_SEED, &count.key().to_bytes(), &params.dst_eid.to_be_bytes()],
        bump
    )]
    pub remote: Account<'info, Remote>,
    #[account(seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
    pub system_program: Program<'info, System>,
}

impl SetRemote<'_> {
    pub fn apply(ctx: &mut Context<SetRemote>, params: &SetRemoteParams) -> Result<()> {
        ctx.accounts.remote.address = params.remote;
        ctx.accounts.remote.bump = ctx.bumps.remote;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetRemoteParams {
    pub id: u8,
    pub dst_eid: u32,
    pub remote: [u8; 32],
}
