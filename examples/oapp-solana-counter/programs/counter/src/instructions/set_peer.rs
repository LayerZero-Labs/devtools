use crate::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: SetPeerParams)]
pub struct SetPeer<'info> {
    #[account(mut, address = count.admin)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = Peer::SIZE,
        seeds = [PEER_SEED, &count.key().to_bytes(), &params.remote_eid.to_be_bytes()],
        bump
    )]
    pub peer: Account<'info, Peer>,
    #[account(
        init_if_needed,
        payer = admin,
        space = Nonce::SIZE,
        seeds = [NONCE_SEED, &count.key().to_bytes(), &params.remote_eid.to_be_bytes(), &params.peer],
        bump
    )]
    pub nonce_account: Account<'info, Nonce>,
    #[account(seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
    pub system_program: Program<'info, System>,
}

impl SetPeer<'_> {
    pub fn apply(ctx: &mut Context<SetPeer>, params: &SetPeerParams) -> Result<()> {
        ctx.accounts.peer.address = params.peer;
        ctx.accounts.peer.bump = ctx.bumps.peer;
        ctx.accounts.nonce_account.bump = ctx.bumps.nonce_account;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetPeerParams {
    pub id: u8,
    pub remote_eid: u32,
    pub peer: [u8; 32],
}
