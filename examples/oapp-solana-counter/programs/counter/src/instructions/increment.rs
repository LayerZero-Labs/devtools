use crate::*;
use anchor_lang::prelude::*;
use oapp::endpoint::{
    instructions::SendParams, state::EndpointSettings, ENDPOINT_SEED, ID as ENDPOINT_ID,
};

#[derive(Accounts)]
#[instruction(params: IncrementParams)]
pub struct Increment<'info> {
    #[account(
        seeds = [
            PEER_SEED,
            &count.key().to_bytes(),
            &params.dst_eid.to_be_bytes()
        ],
        bump = peer.bump
    )]
    pub peer: Account<'info, Peer>,
    #[account(seeds = [COUNT_SEED, &count.id.to_be_bytes()], bump = count.bump)]
    pub count: Account<'info, Count>,
    #[account(seeds = [ENDPOINT_SEED], bump = endpoint.bump, seeds::program = ENDPOINT_ID)]
    pub endpoint: Account<'info, EndpointSettings>,
}
impl<'info> Increment<'info> {
    pub fn apply(ctx: &mut Context<Increment>, params: &IncrementParams) -> Result<()> {
        let message = msg_codec::encode(params.msg_type, ctx.accounts.endpoint.eid);
        let seeds: &[&[u8]] = &[COUNT_SEED, &[ctx.accounts.count.id], &[ctx.accounts.count.bump]];

        // calling endpoint cpi
        let send_params = SendParams {
            dst_eid: params.dst_eid,
            receiver: ctx.accounts.peer.address,
            message,
            options: params.options.clone(),
            native_fee: params.native_fee,
            lz_token_fee: params.lz_token_fee,
        };
        oapp::endpoint_cpi::send(
            ENDPOINT_ID,
            ctx.accounts.count.key(),
            ctx.remaining_accounts,
            seeds,
            send_params,
        )?;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct IncrementParams {
    pub dst_eid: u32,
    pub msg_type: u8,
    pub options: Vec<u8>,
    pub native_fee: u64,
    pub lz_token_fee: u64,
}
