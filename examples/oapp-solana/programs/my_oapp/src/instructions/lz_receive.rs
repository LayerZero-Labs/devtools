use crate::*;
use anchor_lang::prelude::*;
use oapp::{
    endpoint::{
        cpi::accounts::Clear,
        instructions::ClearParams,
        ConstructCPIContext, ID as ENDPOINT_ID,
    },
    LzReceiveParams,
};

#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceive<'info> {
    /// OApp Store PDA.  This account represents the "address" of your OApp on
    /// Solana and can contain any state relevant to your application.
    /// Customize the fields in `Store` as needed.
    #[account(mut, seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
    /// Peer config PDA for the sending chain. Ensures `params.sender` can only be the allowed peer from that remote chain.
    #[account(
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = peer.bump,
        constraint = params.sender == peer.peer_address
    )]
    pub peer: Account<'info, PeerConfig>
}

impl LzReceive<'_> {
    pub fn apply(ctx: &mut Context<LzReceive>, params: &LzReceiveParams) -> Result<()> {
        // The OApp Store PDA is used to sign the CPI to the Endpoint program.
        let seeds: &[&[u8]] = &[STORE_SEED, &[ctx.accounts.store.bump]];

        // The first Clear::MIN_ACCOUNTS_LEN accounts were returned by
        // `lz_receive_types` and are required for Endpoint::clear
        let accounts_for_clear = &ctx.remaining_accounts[0..Clear::MIN_ACCOUNTS_LEN];
        // Call the Endpoint::clear CPI to clear the message from the Endpoint program.
        // This is necessary to ensure the message is processed only once and to
        // prevent replays.
        let _ = oapp::endpoint_cpi::clear(
            ENDPOINT_ID,
            ctx.accounts.store.key(),
            accounts_for_clear,
            seeds,
            ClearParams {
                receiver: ctx.accounts.store.key(),
                src_eid: params.src_eid,
                sender: params.sender,
                nonce: params.nonce,
                guid: params.guid,
                message: params.message.clone(),
            },
        )?;

        // From here on, you can process the message as needed by your use case.
        let string_value = msg_codec::decode(&params.message)?;
        let store = &mut ctx.accounts.store;
        store.string = string_value;

        Ok(())
    }
}

