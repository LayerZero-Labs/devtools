use crate::*;
use anchor_spl::token_interface::Mint;

/// The QuoteOFT instruction calculates fee details, transfer limits, and receipt information for a cross-chain OFT operation.
/// 
/// This instruction exists to maintain parity with the EVM implementation. In the default Solana OFT implementation,
/// the fee breakdown and limit details are not actively used in the core send logic.
#[derive(Accounts)]
#[instruction(params: QuoteOFTParams)]
pub struct QuoteOFT<'info> {
    // OFTStore holds the configuration and state for the OFT.
    // It is a PDA derived using a constant seed and the token escrow account.
    #[account(
        seeds = [OFT_SEED, oft_store.token_escrow.as_ref()],
        bump = oft_store.bump
    )]
    pub oft_store: Account<'info, OFTStore>,

    // PeerConfig holds the fee and other parameters specific to the destination endpoint.
    // It is derived using the peer seed, the OFTStore key, and the destination endpoint ID.
    #[account(
        seeds = [
            PEER_SEED,
            oft_store.key().as_ref(),
            &params.dst_eid.to_be_bytes()
        ],
        bump = peer.bump
    )]
    pub peer: Account<'info, PeerConfig>,

    // The token mint for the OFT. This account's address must match the one stored in the OFTStore.
    #[account(address = oft_store.token_mint)]
    pub token_mint: InterfaceAccount<'info, Mint>,
}

impl QuoteOFT<'_> {
    /// Applies the QuoteOFT instruction.
    ///
    /// It performs the following steps:
    /// 1. Verifies that the OFT is not paused.
    /// 2. Computes the amounts involved in the transfer: the initial amount, the adjusted (post-fee) amount,
    ///    and the fee amount (all in local decimals).
    /// 3. Ensures that the adjusted amount meets the minimum required threshold.
    /// 4. Constructs default transfer limits and fee details.
    /// 5. Returns a receipt summarizing the amount sent and the amount received.
    ///
    /// @dev In the default implementation:
    ///      - Transfer limits are set as 0 and max u64.
    ///      - Detailed fee breakdown (such as "Token2022 Transfer Fee" or "Cross Chain Fee") is provided for parity,
    ///        but is not used by the core logic.
    pub fn apply(ctx: &Context<QuoteOFT>, params: &QuoteOFTParams) -> Result<QuoteOFTResult> {
        // Ensure that the OFT is active (not paused).
        require!(!ctx.accounts.oft_store.paused, OFTError::Paused);

        // Compute the effective amounts:
        // - amount_sent_ld: the original amount to be sent (in local decimals).
        // - amount_received_ld: the final amount that will be credited to the recipient after fees.
        // - oft_fee_ld: the fee amount calculated based on the OFTStore configuration and peer fee basis points.
        // Note: These calculations are provided to maintain parity with the EVM version.
        let (amount_sent_ld, amount_received_ld, oft_fee_ld) = compute_fee_and_adjust_amount(
            params.amount_ld,
            &ctx.accounts.oft_store,
            &ctx.accounts.token_mint,
            ctx.accounts.peer.fee_bps,
        )?;
        
        // Verify that the recipient will receive at least the minimum amount specified.
        require!(amount_received_ld >= params.min_amount_ld, OFTError::SlippageExceeded);

        // Set default transfer limits.
        // For parity with the EVM implementation, these are set to:
        //  - min_amount_ld: 0 (unused by default)
        //  - max_amount_ld: maximum u64 value (unused by default)
        let oft_limits = OFTLimits { min_amount_ld: 0, max_amount_ld: 0xffffffffffffffff };

        // Construct fee details.
        // In the default implementation, the fee details are provided for compatibility,
        // but they do not affect the core token transfer logic.
        let mut oft_fee_details = if amount_received_ld + oft_fee_ld < amount_sent_ld {
            vec![OFTFeeDetail {
                fee_amount_ld: amount_sent_ld - oft_fee_ld - amount_received_ld,
                description: "Token2022 Transfer Fee".to_string(),
            }]
        } else {
            vec![]
        };
        // Append the cross-chain fee detail if applicable.
        if oft_fee_ld > 0 {
            oft_fee_details.push(OFTFeeDetail {
                fee_amount_ld: oft_fee_ld,
                description: "Cross Chain Fee".to_string(),
            });
        }

        // Create a receipt that summarizes the sent and received amounts.
        let oft_receipt = OFTReceipt { amount_sent_ld, amount_received_ld };

        // Return the complete quote result.
        // These fee and limit details are provided to match the EVM interface but are unused by default.
        Ok(QuoteOFTResult { oft_limits, oft_fee_details, oft_receipt })
    }
}

/// Parameters for the QuoteOFT instruction.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct QuoteOFTParams {
    pub dst_eid: u32,
    pub to: [u8; 32],
    pub amount_ld: u64,
    pub min_amount_ld: u64,
    pub options: Vec<u8>,
    pub compose_msg: Option<Vec<u8>>,
    pub pay_in_lz_token: bool,
}

/// Result of the QuoteOFT instruction containing transfer limits, fee details, and a receipt.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct QuoteOFTResult {
    pub oft_limits: OFTLimits,
    pub oft_fee_details: Vec<OFTFeeDetail>,
    pub oft_receipt: OFTReceipt,
}

/// Detailed fee information for a particular fee component.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OFTFeeDetail {
    pub fee_amount_ld: u64,
    pub description: String,
}

/// Receipt summarizing the token amounts involved in the transfer.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OFTReceipt {
    pub amount_sent_ld: u64,
    pub amount_received_ld: u64,
}

/// Transfer limits for the OFT operation.
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct OFTLimits {
    pub min_amount_ld: u64,
    pub max_amount_ld: u64,
}
