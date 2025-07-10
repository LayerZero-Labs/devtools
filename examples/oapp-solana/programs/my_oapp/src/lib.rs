mod errors;
mod instructions;
mod msg_codec;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use oapp::{endpoint::MessagingFee, endpoint_cpi::LzAccount, LzReceiveParams};
use solana_helper::program_id_from_env;
use state::*;

// to build in verifiable mode and using environment variable (what the README instructs), run:
// anchor build -v -e MYOAPP_ID=<OAPP_PROGRAM_ID>
// to build in normal mode and using environment, run:
// MYOAPP_ID=$PROGRAM_ID anchor build 
declare_id!(anchor_lang::solana_program::pubkey::Pubkey::new_from_array(program_id_from_env!(
    "MYOAPP_ID",
    "41NCdrEvXhQ4mZgyJkmqYxL6A1uEmnraGj31UJ6PsXd3" // It's not necessary to change the ID here if you are building using environment variable
)));

const LZ_RECEIVE_TYPES_SEED: &[u8] = b"LzReceiveTypes"; // The Executor relies on this exact seed to derive the LzReceiveTypes PDA. Keep it the same.
const STORE_SEED: &[u8] = b"Store"; // You are free to edit this seed.
const PEER_SEED: &[u8] = b"Peer"; // The Executor relies on this exact seed. Keep it the same.

#[program]
pub mod my_oapp {
    use super::*;

    // ============================== Initializers ==============================
    // In this example, init_store can be called by anyone and can be called only once. Ensure you implement your own access control logic if needed.
    pub fn init_store(mut ctx: Context<InitStore>, params: InitStoreParams) -> Result<()> {
        InitStore::apply(&mut ctx, &params)
    }

    // ============================== Admin ==============================
    // admin instruction to set or update cross-chain peer configuration parameters.
    pub fn set_peer_config(
        mut ctx: Context<SetPeerConfig>,
        params: SetPeerConfigParams,
    ) -> Result<()> {
        SetPeerConfig::apply(&mut ctx, &params)
    }

    // ============================== Public ==============================
    // public instruction returning the estimated MessagingFee for sending a message.
    pub fn quote_send(ctx: Context<QuoteSend>, params: QuoteSendParams) -> Result<MessagingFee> {
        QuoteSend::apply(&ctx, &params)
    }

    // public instruction to send a message to a cross-chain peer.
    pub fn send(mut ctx: Context<Send>, params: SendMessageParams) -> Result<()> {
        Send::apply(&mut ctx, &params)
    }

    // handler for processing incoming cross-chain messages and executing the LzReceive logic
    pub fn lz_receive(mut ctx: Context<LzReceive>, params: LzReceiveParams) -> Result<()> {
        LzReceive::apply(&mut ctx, &params)
    }

    // handler that returns the list of accounts required to execute lz_receive
    pub fn lz_receive_types(
        ctx: Context<LzReceiveTypes>,
        params: LzReceiveParams,
    ) -> Result<Vec<LzAccount>> {
        LzReceiveTypes::apply(&ctx, &params)
    }

}
