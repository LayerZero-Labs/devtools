use oapp::endpoint::{instructions::SkipParams, ID as ENDPOINT_ID};

use crate::*;

#[derive(Accounts)]
#[instruction(params: SkipInboundNonceParams)]
pub struct SkipInboundNonce<'info> {
    #[account(address = store.admin)]
    pub admin: Signer<'info>,
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
    #[account(
        mut,
        seeds = [NONCE_SEED, &params.receiver.as_ref(), &params.src_eid.to_be_bytes(), &params.sender],
        bump = nonce_account.bump
    )]
    pub nonce_account: Account<'info, Nonce>,
}

impl SkipInboundNonce<'_> {
    pub fn apply(
        ctx: &mut Context<SkipInboundNonce>,
        params: &SkipInboundNonceParams,
    ) -> Result<()> {
        let seeds: &[&[u8]] =
            &[STORE_SEED, &[ctx.accounts.store.bump]];

        let _ = oapp::endpoint_cpi::skip_nonce(
            ENDPOINT_ID,
            ctx.remaining_accounts,
            seeds,
            SkipParams {
                receiver: params.receiver,
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
            },
        )?;
        if ctx.accounts.store.ordered_nonce {
            ctx.accounts.nonce_account.max_received_nonce += 1;
        }
        return Ok(());
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SkipInboundNonceParams {
    pub receiver: Pubkey,
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
}
