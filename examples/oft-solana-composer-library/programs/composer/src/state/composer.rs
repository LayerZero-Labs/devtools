use anchor_lang::prelude::*;

#[account]
pub struct Composer {
    /// The OFT PDA (unique to this composer instance)
    pub oft: Pubkey,
    /// The Endpoint PDA (the authorized endpoint for LZ messages)
    pub endpoint_program: Pubkey,
    /// Bump for PDA derivation.
    pub bump: u8,
}

impl Composer {
    // Discriminator (8) + 32 + 32 + 1 = 73 bytes.
    pub const SIZE: usize = 8 + 32 + 32 + 1;
}

/// LzComposeTypesAccounts includes the pubkeys of all accounts used in the lz_compose_types instruction.
/// (Adjust the fields as needed.)
#[account]
pub struct LzComposeTypesAccounts {
    pub composer: Pubkey,
    pub clmm_program: Pubkey,
    pub payer: Pubkey,
    pub amm_config: Pubkey,
    pub pool_state: Pubkey,
    pub input_token_account: Pubkey,
    pub output_token_account: Pubkey,
    pub input_vault: Pubkey,
    pub output_vault: Pubkey,
    pub observation_state: Pubkey,
    pub token_program: Pubkey,
    pub token_program_2022: Pubkey,
    pub memo_program: Pubkey,
    pub input_vault_mint: Pubkey,
    pub output_vault_mint: Pubkey,
    pub lz_program: Pubkey,
    pub authority: Pubkey,
    pub tick_array_lower: Pubkey,
    pub tick_array_current: Pubkey,
    pub tick_array_upper: Pubkey,
}

impl LzComposeTypesAccounts {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}

#[error_code]
pub enum ComposerError {
    #[msg("Invalid 'from' address. The message sender is not the expected OFT PDA.")]
    InvalidFrom,
    #[msg("Invalid 'to' address. The message recipient does not match the composer PDA.")]
    InvalidTo,
}
