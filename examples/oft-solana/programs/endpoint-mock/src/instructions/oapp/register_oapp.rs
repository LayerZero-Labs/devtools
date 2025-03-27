use crate::*;
use cpi_helper::CpiContext;

/// The `RegisterOApp` instruction context is used to register an OApp (Omnichain Application)
/// with the endpoint. This registration is required for cross-chain messaging in the OFT system.
#[derive(CpiContext, Accounts)]
#[instruction(params: RegisterOAppParams)]
pub struct RegisterOApp<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The OApp PDA signer. This represents the application that is registering itself.
    pub oapp: Signer<'info>,

    // The oapp_registry account holds the registry data for the OApp.
    // It is initialized (if needed) with a fixed space defined by `OAppRegistry::INIT_SPACE`.
    // The PDA for this account is derived using the seed `OAPP_SEED` and the oapp's key.
    #[account(
        init,
        payer = payer,
        space = 8 + OAppRegistry::INIT_SPACE,
        seeds = [OAPP_SEED, oapp.key.as_ref()],
        bump
    )]
    pub oapp_registry: Account<'info, OAppRegistry>,

    // The system program is required to initialize new accounts.
    pub system_program: Program<'info, System>,
}

impl RegisterOApp<'_> {
    /// Applies the `register_oapp` instruction.
    ///
    /// This function sets the delegate in the oapp_registry to the provided delegate value,
    /// and stores the bump seed for future PDA derivations.
    pub fn apply(ctx: &mut Context<RegisterOApp>, params: &RegisterOAppParams) -> Result<()> {
        // Set the delegate in the OApp registry to the provided value.
        ctx.accounts.oapp_registry.delegate = params.delegate;
        // Save the bump seed used for PDA derivation in the OApp registry.
        ctx.accounts.oapp_registry.bump = ctx.bumps.oapp_registry;
        Ok(())
    }
}

/// Parameters for the `RegisterOApp` instruction.
///
/// This struct includes:
/// - `delegate`: The public key of the delegate that will be associated with the registered OApp.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RegisterOAppParams {
    pub delegate: Pubkey,
}
