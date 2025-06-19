use crate::*;
use anchor_lang::prelude::*;

// PeerConfig PDAs are used to store configuration for each remote chain
// For each remote chain, a PeerConfig PDA is created with the remote EID as part of the seed
// The PDA holds the peer address and any enforced options for messaging

#[derive(Accounts)]
#[instruction(params: SetPeerConfigParams)]
pub struct SetPeerConfig<'info> {
    #[account(mut, address = store.admin)]
    /// Admin of the OApp store
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = PeerConfig::SIZE,
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.remote_eid.to_be_bytes()],
        bump
    )]
    /// Peer configuration PDA for a specific remote chain
    pub peer: Account<'info, PeerConfig>,
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    /// Store PDA of this OApp
    pub store: Account<'info, Store>,
    pub system_program: Program<'info, System>,
}

impl SetPeerConfig<'_> {
    pub fn apply(ctx: &mut Context<SetPeerConfig>, params: &SetPeerConfigParams) -> Result<()> {
        // Update or create the peer config PDA
        match params.config.clone() {
            PeerConfigParam::PeerAddress(peer_address) => {
                ctx.accounts.peer.peer_address = peer_address;
            },
            PeerConfigParam::EnforcedOptions { send, send_and_call } => {
                oapp::options::assert_type_3(&send)?;
                ctx.accounts.peer.enforced_options.send = send;
                oapp::options::assert_type_3(&send_and_call)?;
                ctx.accounts.peer.enforced_options.send_and_call = send_and_call;
            },
        }
        // Store the PDA bump for later validation
        ctx.accounts.peer.bump = ctx.bumps.peer;
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetPeerConfigParams {
    pub remote_eid: u32,
    pub config: PeerConfigParam,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum PeerConfigParam {
    PeerAddress([u8; 32]),
    /// Optionally enforce specific send options for this peer
    EnforcedOptions { send: Vec<u8>, send_and_call: Vec<u8> },
}