use anchor_lang::prelude::*;

#[error_code]
pub enum ComposerError {
    #[msg("Invalid sender address")]
    InvalidFrom,
    #[msg("Invalid recipient address")]
    InvalidTo,
    #[msg("Invalid mint authority")]
    InvalidMintAuthority,
    #[msg("Invalid token destination")]
    InvalidTokenDest,
    #[msg("Invalid sender")]
    InvalidSender,
    #[msg("Program is paused")]
    Paused,
}

#[account]
pub struct Composer {
    pub oft_pda: Pubkey,
    pub endpoint_pda: Pubkey,
    pub endpoint_program: Pubkey,
    pub token_program: Pubkey,
    pub token_program_2022: Pubkey,
    pub clmm_program: Pubkey,
    pub amm_config: Pubkey,
    pub pool_state: Pubkey,
    pub input_vault: Pubkey,
    pub output_vault: Pubkey,
    pub observation_state: Pubkey,
    pub tick_bitmap: Pubkey,
    pub tick_array_lower: Pubkey,
    pub tick_array_current: Pubkey,
    pub tick_array_upper: Pubkey,
    pub input_token_account: Pubkey,
    pub output_token_account: Pubkey,
    pub input_vault_mint: Pubkey,
    pub output_vault_mint: Pubkey,
    pub bump: u8,
}

impl Composer {
    // 8 (discriminator) + 19*32 + 1
    pub const SIZE: usize = 8 + 19 * 32 + 1;
}

/// LzComposeTypesAccounts includes accounts that are used in the LzComposeTypes
/// instruction.
#[account]
pub struct LzComposeTypesAccounts {
    pub composer: Pubkey,
}

impl LzComposeTypesAccounts {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
