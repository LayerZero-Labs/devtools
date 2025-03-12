use crate::*;

/// Maximum length for enforced options used in "send" operations.
/// These options are pre-defined byte arrays that enforce specific messaging behaviors.
pub const ENFORCED_OPTIONS_SEND_MAX_LEN: usize = 512;
/// Maximum length for enforced options used in "send and call" operations.
pub const ENFORCED_OPTIONS_SEND_AND_CALL_MAX_LEN: usize = 1024;

/// PeerConfig stores the configuration settings for a remote peer endpoint used in cross-chain messaging.
///
/// This state includes:
/// - The peer address used for cross-chain communication.
/// - Enforced options that determine default messaging options for send operations.
/// - Optional rate limiters for both outbound and inbound messages.
/// - An optional fee basis points setting for fee calculations.
/// - A bump seed used for PDA derivation.
#[account]
#[derive(InitSpace)]
pub struct PeerConfig {
    /// The 32-byte address of the remote peer.
    pub peer_address: [u8; 32],
    /// Enforced options for the peer, which determine default messaging options.
    pub enforced_options: EnforcedOptions,
    /// Optional outbound rate limiter to control the rate of outgoing messages.
    pub outbound_rate_limiter: Option<RateLimiter>,
    /// Optional inbound rate limiter to control the rate of incoming messages.
    pub inbound_rate_limiter: Option<RateLimiter>,
    /// Optional fee basis points used for fee calculations.
    pub fee_bps: Option<u16>,
    /// Bump seed used for PDA derivation of the PeerConfig account.
    pub bump: u8,
}

/// RateLimiter is used to enforce limits on the rate of message transfers (both outbound and inbound).
///
/// It keeps track of:
/// - The maximum capacity (i.e., the maximum number of tokens or units available).
/// - The current token count available.
/// - The rate at which tokens are refilled per second.
/// - The last time the refill occurred.
#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize, InitSpace)]
pub struct RateLimiter {
    /// Maximum capacity of the rate limiter.
    pub capacity: u64,
    /// Current number of available tokens.
    pub tokens: u64,
    /// Refill rate in tokens per second.
    pub refill_per_second: u64,
    /// Unix timestamp of the last refill operation.
    pub last_refill_time: u64,
}

impl RateLimiter {
    /// Updates the refill rate for the rate limiter.
    ///
    /// This function first triggers a refill with no extra tokens,
    /// then sets the new refill rate.
    pub fn set_rate(&mut self, refill_per_second: u64) -> Result<()> {
        self.refill(0)?;
        self.refill_per_second = refill_per_second;
        Ok(())
    }

    /// Sets a new capacity for the rate limiter and resets the token count.
    ///
    /// This also updates the `last_refill_time` to the current time.
    pub fn set_capacity(&mut self, capacity: u64) -> Result<()> {
        self.capacity = capacity;
        self.tokens = capacity;
        self.last_refill_time = Clock::get()?.unix_timestamp.try_into().unwrap();
        Ok(())
    }

    /// Refills the rate limiter with extra tokens and tokens accrued since the last refill.
    ///
    /// It calculates how many tokens should be added based on the time elapsed
    /// since the last refill and the configured `refill_per_second`, then updates the
    /// token count while ensuring it does not exceed the capacity.
    pub fn refill(&mut self, extra_tokens: u64) -> Result<()> {
        let mut new_tokens = extra_tokens;
        let current_time: u64 = Clock::get()?.unix_timestamp.try_into().unwrap();
        if current_time > self.last_refill_time {
            let time_elapsed_in_seconds = current_time - self.last_refill_time;
            new_tokens = new_tokens
                .saturating_add(time_elapsed_in_seconds.saturating_mul(self.refill_per_second));
        }
        self.tokens = std::cmp::min(self.capacity, self.tokens.saturating_add(new_tokens));

        self.last_refill_time = current_time;
        Ok(())
    }

    /// Attempts to consume a specified amount of tokens from the rate limiter.
    ///
    /// It first triggers a refill (with no extra tokens) to update the token count.
    /// If there are enough tokens available, it deducts the specified amount; otherwise, it returns an error.
    pub fn try_consume(&mut self, amount: u64) -> Result<()> {
        self.refill(0)?;
        match self.tokens.checked_sub(amount) {
            Some(new_tokens) => {
                self.tokens = new_tokens;
                Ok(())
            },
            None => Err(error!(OFTError::RateLimitExceeded)),
        }
    }
}

/// EnforcedOptions holds the default messaging options for a peer.
///
/// These options are stored as byte arrays, one for "send" operations and one for "send and call" operations.
/// They are used to enforce a particular configuration when composing messages.
#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize, InitSpace)]
pub struct EnforcedOptions {
    /// Enforced options for standard send operations.
    #[max_len(ENFORCED_OPTIONS_SEND_MAX_LEN)]
    pub send: Vec<u8>,
    /// Enforced options for send and call operations.
    #[max_len(ENFORCED_OPTIONS_SEND_AND_CALL_MAX_LEN)]
    pub send_and_call: Vec<u8>,
}

impl EnforcedOptions {
    /// Returns the appropriate enforced options based on whether a composed message is provided.
    ///
    /// If `composed_msg` is None, returns the options for standard send operations;
    /// otherwise, returns the options for send and call operations.
    pub fn get_enforced_options(&self, composed_msg: &Option<Vec<u8>>) -> Vec<u8> {
        if composed_msg.is_none() {
            self.send.clone()
        } else {
            self.send_and_call.clone()
        }
    }

    /// Combines the enforced options with extra options provided at call time.
    ///
    /// This function uses the `combine_options` utility from the oapp options module,
    /// merging the enforced options with the extra options to produce the final options to be applied.
    pub fn combine_options(
        &self,
        compose_msg: &Option<Vec<u8>>,
        extra_options: &Vec<u8>,
    ) -> Result<Vec<u8>> {
        let enforced_options = self.get_enforced_options(compose_msg);
        oapp::options::combine_options(enforced_options, extra_options)
    }
}

// Generate a test to verify the account size for EnforcedOptions.
utils::generate_account_size_test!(EnforcedOptions, enforced_options_test);
