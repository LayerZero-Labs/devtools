use crate::*;
use anchor_lang::solana_program;
use anchor_spl::{
    token_2022::{
        spl_token_2022::instruction::AuthorityType,
        spl_token_2022::{self, solana_program::program_option::COption},
    },
    token_interface::{Mint, TokenInterface},
};

#[derive(Accounts)]
#[instruction()]
pub struct RenounceFreezeAuthority<'info> {
    pub admin: Signer<'info>,
    #[account(
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump,
        has_one = admin @OFTError::Unauthorized
    )]
    pub oft_store: Account<'info, OFTStore>,
    #[account(
        mut,
        constraint = token_mint.freeze_authority.is_some() @CustomError::NoFreezeAuthority,
        address = oft_store.token_mint,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        constraint = token_mint.freeze_authority == COption::Some(current_authority.key()) @CustomError::InvalidFreezeAuthority
    )]
    pub current_authority: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

//
impl RenounceFreezeAuthority<'_> {
    pub fn apply(ctx: Context<RenounceFreezeAuthority>) -> Result<()> {
        let oft_store_seed = ctx.accounts.oft_store.token_escrow.key();
        let seeds: &[&[u8]] = &[
            OFT_SEED,
            oft_store_seed.as_ref(),
            &[ctx.accounts.oft_store.bump],
        ];

        // Create the set_authority instruction directly
        let ix = spl_token_2022::instruction::set_authority(
            ctx.accounts.token_program.key,
            &ctx.accounts.token_mint.key(),
            None, // new authority
            AuthorityType::FreezeAccount,
            &ctx.accounts.current_authority.key(),
            &[&ctx.accounts.oft_store.key()],
        )?;

        // Invoke with signing
        solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.token_mint.to_account_info(),
                ctx.accounts.current_authority.to_account_info(),
                ctx.accounts.oft_store.to_account_info(),
            ],
            &[&seeds],
        )?;

        Ok(())
    }
}

#[error_code]
pub enum CustomError {
    #[msg("No freeze authority exists on this mint.")]
    NoFreezeAuthority,
    #[msg("The provided authority does not match the freeze authority.")]
    InvalidFreezeAuthority,
}
