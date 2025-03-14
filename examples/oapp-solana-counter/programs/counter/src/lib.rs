mod errors;
mod instructions;
mod msg_codec;
mod state;

use anchor_lang::prelude::*;
use errors::*;
use instructions::*;
use oapp::{endpoint::MessagingFee, endpoint_cpi::LzAccount, LzComposeParams, LzReceiveParams};
use solana_helper::program_id_from_env;
use state::*;

declare_id!(anchor_lang::solana_program::pubkey::Pubkey::new_from_array(program_id_from_env!(
    "OMNICOUNTER_ID",
    "HFyiETGKEUS9tr87K1HXmVJHkqQRtw8wShRNTMkKKxay"
)));

const LZ_RECEIVE_TYPES_SEED: &[u8] = b"LzReceiveTypes";
const LZ_COMPOSE_TYPES_SEED: &[u8] = b"LzComposeTypes";
const COUNT_SEED: &[u8] = b"Count";
const PEER_SEED: &[u8] = b"Peer";
const NONCE_SEED: &[u8] = b"Nonce";

#[program]
pub mod omnicounter {
    use super::*;

    pub fn init_count(mut ctx: Context<InitCount>, params: InitCountParams) -> Result<()> {
        InitCount::apply(&mut ctx, &params)
    }

    pub fn set_peer(mut ctx: Context<SetPeer>, params: SetPeerParams) -> Result<()> {
        SetPeer::apply(&mut ctx, &params)
    }

    pub fn quote(ctx: Context<Quote>, params: QuoteParams) -> Result<MessagingFee> {
        Quote::apply(&ctx, &params)
    }

    pub fn increment(mut ctx: Context<Increment>, params: IncrementParams) -> Result<()> {
        Increment::apply(&mut ctx, &params)
    }

    pub fn lz_receive(mut ctx: Context<LzReceive>, params: LzReceiveParams) -> Result<()> {
        LzReceive::apply(&mut ctx, &params)
    }

    pub fn lz_receive_types(
        ctx: Context<LzReceiveTypes>,
        params: LzReceiveParams,
    ) -> Result<Vec<LzAccount>> {
        LzReceiveTypes::apply(&ctx, &params)
    }

    pub fn lz_compose(mut ctx: Context<LzCompose>, params: LzComposeParams) -> Result<()> {
        LzCompose::apply(&mut ctx, &params)
    }

    pub fn lz_compose_types(
        ctx: Context<LzComposeTypes>,
        params: LzComposeParams,
    ) -> Result<Vec<LzAccount>> {
        LzComposeTypes::apply(&ctx, &params)
    }

    pub fn next_nonce(ctx: Context<NextNonce>, params: NextNonceParams) -> Result<u64> {
        NextNonce::apply(&ctx, &params)
    }

    pub fn skip_inbound_nonce(
        mut ctx: Context<SkipInboundNonce>,
        params: SkipInboundNonceParams,
    ) -> Result<()> {
        SkipInboundNonce::apply(&mut ctx, &params)
    }

    pub fn set_ordered_nonce(
        mut ctx: Context<SetOrderedNonce>,
        params: SetOrderedNonceParams,
    ) -> Result<()> {
        SetOrderedNonce::apply(&mut ctx, &params)
    }
}
