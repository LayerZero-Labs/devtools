mod errors;
mod instructions;
mod msg_codec;
mod state;

use anchor_lang::prelude::*;
use errors::*;
use instructions::*;
use oapp::{endpoint::MessagingFee, endpoint_cpi::LzAccount, LzComposeParams, LzReceiveParams};
use state::*;

declare_id!("2tLJfE12h5RY7vJqK6i41taeg8ejzigoFXduBanDV4Cu");

const LZ_RECEIVE_TYPES_SEED: &[u8] = b"LzReceiveTypes";
const LZ_COMPOSE_TYPES_SEED: &[u8] = b"LzComposeTypes";
const COUNT_SEED: &[u8] = b"Count";
const REMOTE_SEED: &[u8] = b"Remote";

#[program]
pub mod omnicounter {
    use super::*;

    pub fn init_count(mut ctx: Context<InitCount>, params: InitCountParams) -> Result<()> {
        InitCount::apply(&mut ctx, &params)
    }

    pub fn set_remote(mut ctx: Context<SetRemote>, params: SetRemoteParams) -> Result<()> {
        SetRemote::apply(&mut ctx, &params)
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
}
