mod errors;
mod instructions;
mod msg_codec;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use oapp::{endpoint::MessagingFee, endpoint_cpi::LzAccount, LzReceiveParams};
use solana_helper::program_id_from_env;
use state::*;

declare_id!(anchor_lang::solana_program::pubkey::Pubkey::new_from_array(program_id_from_env!(
    "MYOAPP_ID",
    "41NCdrEvXhQ4mZgyJkmqYxL6A1uEmnraGj31UJ6PsXd3"
)));

const LZ_RECEIVE_TYPES_SEED: &[u8] = b"LzReceiveTypes";
const STORE_SEED: &[u8] = b"Store";
const PEER_SEED: &[u8] = b"Peer";

#[program]
pub mod my_oapp {
    use super::*;

    pub fn init_store(mut ctx: Context<InitStore>, params: InitStoreParams) -> Result<()> {
        InitStore::apply(&mut ctx, &params)
    }

    // ============================== Admin ==============================

    pub fn set_peer_config(
        mut ctx: Context<SetPeerConfig>,
        params: SetPeerConfigParams,
    ) -> Result<()> {
        SetPeerConfig::apply(&mut ctx, &params)
    }

    // ============================== Public ==============================

    pub fn quote_send(ctx: Context<QuoteSend>, params: QuoteSendParams) -> Result<MessagingFee> {
        QuoteSend::apply(&ctx, &params)
    }

    pub fn send(mut ctx: Context<Send>, params: SendMessageParams) -> Result<()> {
        Send::apply(&mut ctx, &params)
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

}
