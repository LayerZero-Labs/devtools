mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;

use oapp::{endpoint_cpi::LzAccount, LzComposeParams};

use state::*;

declare_id!("2TUdVCMQsefMs28hTeMKAHTjgz8cdMbo7V5oEdrYSu7G");

const LZ_COMPOSE_TYPES_SEED: &[u8] = b"LzComposeTypes";
const COMPOSER_SEED: &[u8] = b"Composer";

#[program]
pub mod composer {
    use super::*;
    pub fn init_composer(mut ctx: Context<InitComposer>, params: InitComposerParams) -> Result<()> {
        InitComposer::apply(&mut ctx, &params)
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
