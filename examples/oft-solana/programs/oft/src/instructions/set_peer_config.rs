use crate::*;

/// Accounts required for setting the peer configuration for an OFT (Omnichain Fungible Token).
///
/// This instruction allows the admin to initialize or update a PeerConfig account for a remote endpoint.
/// The PeerConfig account stores parameters such as the peer address, fee settings, enforced options, 
/// and rate limits for outbound and inbound cross-chain messaging.
#[derive(Accounts)]
#[instruction(params: SetPeerConfigParams)]
pub struct SetPeerConfig<'info> {
    // The admin must sign the transaction to update the peer configuration.
    #[account(mut)]
    pub admin: Signer<'info>,
    // The PeerConfig account is derived using the peer seed, the OFTStore key, and the remote endpoint ID.
    // It is initialized if it does not exist. This account stores configuration for the remote peer.
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + PeerConfig::INIT_SPACE,
        seeds = [PEER_SEED, oft_store.key().as_ref(), &params.remote_eid.to_be_bytes()],
        bump
    )]
    pub peer: Account<'info, PeerConfig>,
    // The OFTStore account holds the configuration, state, and fee settings for the OFT.
    // It is derived using a seed (OFT_SEED and the token escrow account) and its bump.
    // The `has_one = admin` constraint ensures that only the current admin can update the configuration.
    #[account(
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump,
        has_one = admin @OFTError::Unauthorized
    )]
    pub oft_store: Account<'info, OFTStore>,
    // The system program is required for account initialization.
    pub system_program: Program<'info, System>,
}

impl SetPeerConfig<'_> {
    /// Applies the peer configuration update based on the provided parameters.
    ///
    /// This function matches on the configuration parameter variant and updates the PeerConfig account accordingly:
    /// - **PeerAddress:** Updates the peer's address used for cross-chain messaging.
    /// - **FeeBps:** Updates the fee basis points used to compute fees for cross-chain transfers.
    /// - **EnforcedOptions:** Updates the enforced options for both send and send-and-call operations.
    /// - **OutboundRateLimit:** Updates the outbound rate limiter parameters.
    /// - **InboundRateLimit:** Updates the inbound rate limiter parameters.
    ///
    /// After processing the configuration, the PeerConfig account's bump is updated from the context.
    pub fn apply(ctx: &mut Context<SetPeerConfig>, params: &SetPeerConfigParams) -> Result<()> {
        match params.config.clone() {
            // Update the peer address.
            PeerConfigParam::PeerAddress(peer_address) => {
                ctx.accounts.peer.peer_address = peer_address;
            },
            // Update the fee basis points. If provided, ensure it is within valid limits.
            PeerConfigParam::FeeBps(fee_bps) => {
                if let Some(fee_bps) = fee_bps {
                    require!(fee_bps < MAX_FEE_BASIS_POINTS, OFTError::InvalidFee);
                }
                ctx.accounts.peer.fee_bps = fee_bps;
            },
            // Update the enforced options used for cross-chain messaging.
            // The enforced options are checked for type correctness (assert_type_3) and then updated.
            PeerConfigParam::EnforcedOptions { send, send_and_call } => {
                oapp::options::assert_type_3(&send)?;
                ctx.accounts.peer.enforced_options.send = send;
                oapp::options::assert_type_3(&send_and_call)?;
                ctx.accounts.peer.enforced_options.send_and_call = send_and_call;
            },
            // Update the outbound rate limiter configuration.
            // This sets parameters such as refill rate and capacity for outbound messages.
            PeerConfigParam::OutboundRateLimit(rate_limit_params) => {
                Self::update_rate_limiter(
                    &mut ctx.accounts.peer.outbound_rate_limiter,
                    &rate_limit_params,
                )?;
            },
            // Update the inbound rate limiter configuration.
            // This sets parameters such as refill rate and capacity for inbound messages.
            PeerConfigParam::InboundRateLimit(rate_limit_params) => {
                Self::update_rate_limiter(
                    &mut ctx.accounts.peer.inbound_rate_limiter,
                    &rate_limit_params,
                )?;
            },
        }
        // Update the bump value for the PeerConfig account from the context.
        ctx.accounts.peer.bump = ctx.bumps.peer;
        Ok(())
    }

    /// Helper function to update a rate limiter.
    ///
    /// If new rate limit parameters are provided, it updates or initializes the rate limiter
    /// with the specified capacity and refill rate. If no parameters are provided, the rate limiter is cleared.
    fn update_rate_limiter(
        rate_limiter: &mut Option<RateLimiter>,
        params: &Option<RateLimitParams>,
    ) -> Result<()> {
        if let Some(param) = params {
            // Clone the existing rate limiter or use a default if none exists.
            let mut limiter = rate_limiter.clone().unwrap_or_default();
            // Update the capacity if provided.
            if let Some(capacity) = param.capacity {
                limiter.set_capacity(capacity)?;
            }
            // Update the refill rate if provided.
            if let Some(refill_rate) = param.refill_per_second {
                limiter.set_rate(refill_rate)?;
            }
            *rate_limiter = Some(limiter);
        } else {
            // Clear the rate limiter if no parameters are provided.
            *rate_limiter = None;
        }
        Ok(())
    }
}

/// Parameters for updating the peer configuration.
///
/// This struct contains:
/// - `remote_eid`: The remote endpoint identifier for which the peer configuration is set.
/// - `config`: The specific configuration parameter to update.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SetPeerConfigParams {
    pub remote_eid: u32,
    pub config: PeerConfigParam,
}

/// Enum representing the different peer configuration parameters that can be updated.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub enum PeerConfigParam {
    /// Update the peer address used for cross-chain messaging.
    PeerAddress([u8; 32]),
    /// Update the fee basis points (optional) for fee calculations.
    FeeBps(Option<u16>),
    /// Update the enforced options for send and send-and-call operations.
    EnforcedOptions { send: Vec<u8>, send_and_call: Vec<u8> },
    /// Update the outbound rate limiter parameters.
    OutboundRateLimit(Option<RateLimitParams>),
    /// Update the inbound rate limiter parameters.
    InboundRateLimit(Option<RateLimitParams>),
}

/// Rate limiter parameters used to configure rate limiting for cross-chain messages.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RateLimitParams {
    /// The refill rate per second for the rate limiter.
    pub refill_per_second: Option<u64>,
    /// The capacity of the rate limiter.
    pub capacity: Option<u64>,
}
