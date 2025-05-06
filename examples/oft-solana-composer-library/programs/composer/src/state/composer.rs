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

/// This PDA holds all of the static pubkeys that `lz_compose_types` will consume.
#[account]
pub struct LzComposeTypesAccounts {
    // 0) endpoint program
    pub endpoint_program: Pubkey,
    // 1) token program
    pub token_program: Pubkey,
    // 2) token program 2022
    pub token_program_2022: Pubkey,
    // 3) composer
    pub composer: Pubkey,
    // 4) clmm program
    pub clmm_program: Pubkey,
    // 5) amm config
    pub amm_config: Pubkey,
    // 6) pool state
    pub pool_state: Pubkey,
    // 7) input token account
    pub input_token_account: Pubkey,
    // 8) output token account
    pub output_token_account: Pubkey,
    // 9) input vault
    pub input_vault: Pubkey,
    // 10) output vault
    pub output_vault: Pubkey,
    // 11) observation state
    pub observation_state: Pubkey,
    // 12) tick bitmap
    pub tick_bitmap: Pubkey,
    // 13) tick array lower
    pub tick_array_lower: Pubkey,
    // 14) tick array current
    pub tick_array_current: Pubkey,
    // 15) tick array upper
    pub tick_array_upper: Pubkey,
    // 16) memo program
    pub memo_program: Pubkey,
    // 17) input vault mint
    pub input_vault_mint: Pubkey,
    // 18) output vault mint
    pub output_vault_mint: Pubkey,
}

impl LzComposeTypesAccounts {
    // Discriminator (8) + size_of::<Self>()
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
