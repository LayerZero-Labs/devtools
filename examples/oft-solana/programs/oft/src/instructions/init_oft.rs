use crate::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use oapp::endpoint::{instructions::RegisterOAppParams, ID as ENDPOINT_ID};

/// Accounts required to initialize an OFT (Omnichain Fungible Token) instance.
///
/// - `payer`: The account paying for the initialization fees.
/// - `oft_store`: The program-derived account that will hold the OFT configuration and state.
/// - `lz_receive_types_accounts`: An auxiliary account used to store receive-type configuration for cross-chain messages.
/// - `token_mint`: The SPL token mint associated with this OFT.
/// - `token_escrow`: The escrow account (associated with `oft_store`) that holds tokens during cross-chain operations.
/// - `token_program`: The SPL Token program interface.
/// - `system_program`: The Solana system program for account initialization.
#[derive(Accounts)]
pub struct InitOFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Initialize the OFTStore account with the required space and PDA derivation.
    #[account(
        init,
        payer = payer,
        space = 8 + OFTStore::INIT_SPACE,
        seeds = [OFT_SEED, token_escrow.key().as_ref()],
        bump
    )]
    pub oft_store: Account<'info, OFTStore>,

    // Initialize the LzReceiveTypesAccounts account which holds account mappings used in cross-chain messaging.
    #[account(
        init,
        payer = payer,
        space = 8 + LzReceiveTypesAccounts::INIT_SPACE,
        seeds = [LZ_RECEIVE_TYPES_SEED, oft_store.key().as_ref()],
        bump
    )]
    pub lz_receive_types_accounts: Account<'info, LzReceiveTypesAccounts>,

    // The SPL token mint for this OFT.
    #[account(mint::token_program = token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    // Initialize the token escrow account that will be controlled by the OFTStore.
    // This account holds tokens during cross-chain operations.
    #[account(
        init,
        payer = payer,
        token::authority = oft_store,
        token::mint = token_mint,
        token::token_program = token_program,
    )]
    pub token_escrow: InterfaceAccount<'info, TokenAccount>,

    // The SPL Token program.
    pub token_program: Interface<'info, TokenInterface>,

    // The System program is required for account creation and initialization.
    pub system_program: Program<'info, System>,
}

impl InitOFT<'_> {
    /// Applies the initialization logic for the OFT.
    ///
    /// This function performs the following:
    /// 1. Sets the OFTStore configuration based on the provided parameters.
    /// 2. Computes the conversion rate from local decimals to shared decimals.
    /// 3. Initializes associated account fields in both `oft_store` and `lz_receive_types_accounts`.
    /// 4. Registers the oapp with the endpoint using a CPI call.
    ///
    /// # Parameters
    /// - `ctx`: The context containing all the accounts.
    /// - `params`: Parameters used for initializing the OFT.
    pub fn apply(ctx: &mut Context<InitOFT>, params: &InitOFTParams) -> Result<()> {
        // --- Initialize the OFTStore ---
        // Set the OFT type (Native or Adapter) as provided.
        ctx.accounts.oft_store.oft_type = params.oft_type.clone();

        // Ensure the token mint has enough decimals to support the desired shared decimals.
        require!(
            ctx.accounts.token_mint.decimals >= params.shared_decimals,
            OFTError::InvalidDecimals
        );

        // Compute the conversion rate from local decimals (ld) to shared decimals (sd):
        // ld2sd_rate = 10^(token_mint.decimals - shared_decimals)
        ctx.accounts.oft_store.ld2sd_rate =
            10u64.pow((ctx.accounts.token_mint.decimals - params.shared_decimals) as u32);

        // Set the token mint and escrow addresses in the OFTStore.
        ctx.accounts.oft_store.token_mint = ctx.accounts.token_mint.key();
        ctx.accounts.oft_store.token_escrow = ctx.accounts.token_escrow.key();

        // Configure the endpoint program. Use the provided endpoint_program if set;
        // otherwise, default to the constant ENDPOINT_ID.
        ctx.accounts.oft_store.endpoint_program =
            if let Some(endpoint_program) = params.endpoint_program {
                endpoint_program
            } else {
                ENDPOINT_ID
            };

        // Save the bump seed for the OFTStore PDA.
        ctx.accounts.oft_store.bump = ctx.bumps.oft_store;

        // Initialize the total value locked (TVL) to zero.
        ctx.accounts.oft_store.tvl_ld = 0;

        // Set the admin for the OFT (this account will control further administrative actions).
        ctx.accounts.oft_store.admin = params.admin;

        // Set default fee parameters and pause state.
        ctx.accounts.oft_store.default_fee_bps = 0;
        ctx.accounts.oft_store.paused = false;
        ctx.accounts.oft_store.pauser = None;
        ctx.accounts.oft_store.unpauser = None;

        // --- Initialize the LzReceiveTypesAccounts ---
        // Link the LzReceiveTypesAccounts to the current OFTStore and token mint.
        ctx.accounts.lz_receive_types_accounts.oft_store = ctx.accounts.oft_store.key();
        ctx.accounts.lz_receive_types_accounts.token_mint = ctx.accounts.token_mint.key();

        // --- Register the OApp (Endpoint) ---
        // This CPI call registers the OFTStore with the endpoint program.
        // It enables the cross-chain messaging features and configures the delegate (admin) for events.
        oapp::endpoint_cpi::register_oapp(
            ctx.accounts.oft_store.endpoint_program, // The endpoint program for cross-chain messaging.
            ctx.accounts.oft_store.key(),              // The OFTStore being registered.
            ctx.remaining_accounts,                    // Additional accounts needed for the registration.
            // The seeds used for signing (ensuring the correct PDA is used).
            &[OFT_SEED, ctx.accounts.token_escrow.key().as_ref(), &[ctx.bumps.oft_store]],
            // Registration parameters, setting the delegate to the admin.
            RegisterOAppParams { delegate: params.admin },
        )
    }
}

/// Parameters used to initialize an OFT instance.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct InitOFTParams {
    /// The type of OFT (e.g., Native or Adapter).
    pub oft_type: OFTType,
    /// The administrator's public key for the OFT.
    pub admin: Pubkey,
    /// The number of shared decimals to be used in cross-chain operations.
    pub shared_decimals: u8,
    /// Optionally, a custom endpoint program public key.
    pub endpoint_program: Option<Pubkey>,
}
