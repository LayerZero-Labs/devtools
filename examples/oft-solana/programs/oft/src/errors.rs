use anchor_lang::prelude::error_code;

/// Error codes for the OFT (Omnichain Fungible Token) program.
///
/// These error variants cover authorization issues, configuration errors, rate limiting,
/// fee validation, and operational state errors.
#[error_code]
pub enum OFTError {
    /// Returned when the signer is not authorized to perform the requested action.
    Unauthorized,
    /// Returned when the sender of a message does not match the expected peer.
    InvalidSender,
    /// Returned when the token mint's decimal configuration is insufficient.
    InvalidDecimals,
    /// Returned when the amount received after fees falls below the minimum expected,
    /// indicating that slippage is too high.
    SlippageExceeded,
    /// Returned when the destination token account does not match the expected address.
    InvalidTokenDest,
    /// Returned when a rate limiter does not have enough tokens to allow the operation.
    RateLimitExceeded,
    /// Returned when a fee value is out of the acceptable range.
    InvalidFee,
    /// Returned when the provided mint authority does not match the token mint's stored authority.
    InvalidMintAuthority,
    /// Returned when an operation is attempted while the OFT is paused.
    Paused,
}
