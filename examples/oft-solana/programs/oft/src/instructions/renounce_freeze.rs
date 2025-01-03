use crate::*;
use anchor_lang::solana_program;
use anchor_spl::token_2022::spl_token_2022;
use anchor_spl::token_2022::spl_token_2022::instruction::AuthorityType;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
#[instruction()]
pub struct RenounceFreezeAuthority<'info> {
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump,
        constraint = is_valid_signer(signer.key(), &oft_store) @OFTError::Unauthorized
    )]
    pub oft_store: Account<'info, OFTStore>,
    #[account(
        mut,
        address = oft_store.token_escrow,
        token::authority = oft_store,
        token::mint = token_mint,
        token::token_program = token_program
    )]
    pub token_escrow: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        address = oft_store.token_mint,
        mint::token_program = token_program
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub current_authority: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

//
impl RenounceFreezeAuthority<'_> {
    pub fn apply(ctx: Context<RenounceFreezeAuthority>) -> Result<()> {
        let mint = &ctx.accounts.token_mint;

        // Ensure freeze authority is set
        require!(
            mint.freeze_authority.is_some(),
            CustomError::NoFreezeAuthority
        );

        let oft_store_seed = ctx.accounts.token_escrow.key();
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

// Custom error for validation
#[error_code]
pub enum CustomError {
    #[msg("No freeze authority exists on this mint.")]
    NoFreezeAuthority,
}

fn is_valid_signer(signer: Pubkey, oft_store: &OFTStore) -> bool {
    oft_store.admin == signer
}
