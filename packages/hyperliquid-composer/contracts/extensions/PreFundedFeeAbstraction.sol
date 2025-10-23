// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { HyperLiquidComposer } from "../HyperLiquidComposer.sol";
import { FeeToken } from "../extensions/FeeToken.sol";
import { RecoverableComposer } from "../extensions/RecoverableComposer.sol";

import { IHyperAssetAmount } from "../interfaces/IHyperLiquidComposer.sol";
import { IPreFundedFeeAbstraction, SpotInfo, TokenInfo } from "../interfaces/IPreFundedFeeAbstraction.sol";

/**
 * @title Pre-funded Fee Abstraction
 * @author LayerZero Labs (@shankars99)
 * @notice Extension that allows using deposited assets for activation fees, by being pre-funded with quote tokens.
 * @dev The composer calculates USD-equivalent fee amounts using real-time HyperCore spot prices and asset conversion.
 * @dev Accumulated fees can be retrieved by the recovery address for external liquidation.
 * @dev This contract needs to be periodically funded with quote tokens.
 * @dev Activations will stop working if the contract holds less than `MAX_USERS_PER_BLOCK` quote tokens,
 *      to avoid multiple users trying to activate in the same block, and silently reverting on HyperCore.
 * @dev This contract assumes 1 quote token = 1 USD = activation fee.
 * @dev Activation fees are automatically deducted from the composer's balance on HyperCore.
 */
abstract contract PreFundedFeeAbstraction is FeeToken, RecoverableComposer, IPreFundedFeeAbstraction {
    using SafeERC20 for IERC20;

    address internal constant SPOT_PX_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000808;
    address internal constant SPOT_INFO_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080b;
    address internal constant TOKEN_INFO_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080C;

    /// @dev Hyperliquid protocol constant: spot prices use `MAX_DECIMALS` of 8.
    uint8 internal constant SPOT_PRICE_MAX_DECIMALS = 8;

    /// @dev Maximum safe decimal difference to prevent overflow in activationFee calculation.
    /// @dev Ensures `ACTIVATION_COST * SPOT_PRICE_DECIMALS` stays within uint64 bounds.
    uint8 internal constant MAX_DECIMAL_DIFFERENCE = 11;

    /// @dev Hyperliquid protocol requires 1 quote token for activation.
    uint64 internal constant BASE_ACTIVATION_FEE_CENTS = 100;

    /// @dev If fee is withdrawn on a block revert all activations
    uint256 public feeWithdrawalBlockNumber = 0;

    /// @dev Total activation cost in quote token wei (base + overhead). Scaled to core spot decimals.
    uint64 public immutable ACTIVATION_COST;

    /// @dev Spot pair ID for the asset/quote pair (e.g., 107 for HYPE/USDC).
    uint64 public immutable SPOT_PAIR_ID;

    /// @dev Quote asset core index (e.g., 0 for USDC, 150 for HYPE).
    uint64 public immutable QUOTE_ASSET_INDEX;

    /// @dev Quote asset core decimals (e.g., 8 for USDC, 8 for HYPE).
    uint64 public immutable QUOTE_ASSET_DECIMALS;
    /// @dev Pre-calculated spot price decimals for gas efficiency: (8 - `szDecimals`).
    uint64 public immutable SPOT_PRICE_DECIMALS;
    /// @dev Pre-calculated numerator for activation fee calculation: (ACTIVATION_COST * SPOT_PRICE_DECIMALS).
    /// @dev Stored as immutable to save gas on every activationFee() call.
    uint128 public immutable ACTIVATION_FEE_NUMERATOR;

    /// @dev USD value of the minimum pre-fund amount. Not scaled to core spot decimals.
    /// @dev The maximum number of transactions that can be fit in a single HyperEVM block.
    /// @dev This is because `spotBalance` returns the same value for all transactions in a HyperEVM block.
    uint64 public maxUsersPerBlock = 100;

    /**
     * @notice Constructor for the `PreFundedFeeAbstraction` extension.
     * @dev Needs to be executed after `HyperLiquidComposer` constructor.
     * @param _spotPairId The spot pair ID for the asset/quote pair (e.g., 107 for HYPE/USDC)
     * @param _activationOverheadFee Non-zero activation overhead fee in cents on top of $1 base (e.g., 50 = 50 cents = $0.50 overhead)
     */
    constructor(uint64 _spotPairId, uint16 _activationOverheadFee) {
        if (_activationOverheadFee == 0) revert ZeroActivationOverheadFee();

        uint64[2] memory tokens = _spotInfo(_spotPairId).tokens;
        uint64 assetIndex = tokens[0];
        QUOTE_ASSET_INDEX = tokens[1];

        /// @dev The spot pair ID is NOT the same as the core asset index.
        ///      Example: HYPE has core index 150 but HYPE/USDC has spot pair ID 107.
        if (assetIndex != ERC20_CORE_INDEX_ID) revert InvalidSpotPair();
        SPOT_PAIR_ID = _spotPairId;

        TokenInfo memory baseAssetInfo = _tokenInfo(assetIndex);
        TokenInfo memory quoteAssetInfo = _tokenInfo(QUOTE_ASSET_INDEX);

        /// @dev Future-proof: Validate decimals won't cause overflow in activationFee calculation.
        /// @dev Currently unnecessary given quote assets have fixed weiDecimals=8 and szDecimals=2,
        ///      but protects against future protocol changes where quote assets might have different decimals.
        if (quoteAssetInfo.weiDecimals > baseAssetInfo.szDecimals + MAX_DECIMAL_DIFFERENCE) {
            revert ExcessiveDecimalDifference();
        }

        /// @dev Hyperliquid protocol uses (8 - `szDecimals`) for spot price decimal encoding.
        SPOT_PRICE_DECIMALS = uint64(10 ** (SPOT_PRICE_MAX_DECIMALS - baseAssetInfo.szDecimals));
        QUOTE_ASSET_DECIMALS = uint64(10 ** quoteAssetInfo.weiDecimals);

        uint64 totalCentsAmount = BASE_ACTIVATION_FEE_CENTS + _activationOverheadFee;
        ACTIVATION_COST = uint64((totalCentsAmount * QUOTE_ASSET_DECIMALS) / 100);

        /// @dev Pre-calculate the numerator for gas efficiency in activationFee() calls.
        /// @dev u64 * u64 = u128, so no overflow possible.
        ACTIVATION_FEE_NUMERATOR = ACTIVATION_COST * SPOT_PRICE_DECIMALS;

        if (uint256(maxUsersPerBlock) * uint256(QUOTE_ASSET_DECIMALS) > type(uint64).max)
            revert MinUSDAmtGreaterThanU64Max();
    }

    /**
     * @dev Override to track activation fees during transfers.
     * @inheritdoc HyperLiquidComposer
     */
    function _transferERC20ToHyperCore(address _to, uint256 _amountLD) internal virtual override {
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(
            ERC20_CORE_INDEX_ID,
            ERC20_DECIMAL_DIFF,
            ERC20_ASSET_BRIDGE,
            _amountLD
        );

        bool isActivated = coreUserExists(_to).exists;

        if (amounts.evm != 0) {
            uint64 originalAmount = amounts.core;
            uint64 coreAmount = _getFinalCoreAmount(_to, originalAmount);

            /// @dev When user is activated originalAmount = coreAmount, so no fee is collected.
            if (isActivated) {
                /// @dev If fee is withdrawn on a block revert all activations
                /// @dev Transactions executed before the fee withdrawal tx will be activated
                if (block.number == feeWithdrawalBlockNumber) revert CannotActivateOnFeeWithdrawalBlock();

                uint64 coreBalance = spotBalance(address(this), QUOTE_ASSET_INDEX).total;

                /// @dev Otherwise, this could revert silently if multiple users try to activate in the same block.
                uint256 requiredCoreBalance = maxUsersPerBlock * QUOTE_ASSET_DECIMALS;
                if (coreBalance < requiredCoreBalance) revert InsufficientCoreBalance(coreBalance, requiredCoreBalance);

                uint64 feeCollected = originalAmount - coreAmount;
                emit FeeCollected(_to, feeCollected);
            }

            IERC20(ERC20).safeTransfer(ERC20_ASSET_BRIDGE, amounts.evm);
            _submitCoreWriterTransfer(_to, ERC20_CORE_INDEX_ID, coreAmount);
        } else {
            if (msg.value > 0 && isActivated) revert HYPEActivationNotAllowed();
        }
    }

    /**
     * @notice Calculates activation fee in asset tokens using current spot price.
     * @return Activation fee amount in core asset decimals
     */
    function activationFee() public view virtual override returns (uint64) {
        uint64 rawPrice = _spotPx(SPOT_PAIR_ID);

        /// @dev Prevent zero-fee edge case: When rawPrice > ACTIVATION_FEE_NUMERATOR,
        ///      the division ACTIVATION_FEE_NUMERATOR / rawPrice < 1 rounds down to 0.
        ///      This would cause silent failures where Core expects payment but contract calculates zero fee.
        /// @dev Trigger thresholds (ACTIVATION_COST ≈ $1.50):
        ///      - szDecimals = 0 (min): token_price > $1B USD
        ///      - szDecimals = 5 (max): token_price > $150M USD (ex: BTC)
        if (rawPrice > ACTIVATION_FEE_NUMERATOR) revert PriceExceedsActivationFeeNumerator(rawPrice);

        return uint64(ACTIVATION_FEE_NUMERATOR / rawPrice);
    }

    /**
     * @notice Retrieves quote tokens from HyperCore to a specified address
     * @dev Transfers quote tokens from the composer's HyperCore balance to the specified address
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of quote tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     * @param _to Destination address to receive the retrieved quote tokens
     */
    function retrieveQuoteTokens(uint64 _coreAmount, address _to) public virtual onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(QUOTE_ASSET_INDEX, _coreAmount);

        _submitCoreWriterTransfer(_to, QUOTE_ASSET_INDEX, maxTransferAmt);
        feeWithdrawalBlockNumber = block.number;
        emit Retrieved(QUOTE_ASSET_INDEX, maxTransferAmt, _to);
    }

    /**
     * @notice Updates the maximum number of users per block.
     * @dev Required if hyperliquid increases the block size.
     * @dev Can only be called by the recovery address
     * @param _maxUsersPerBlock The new maximum number of users per block
     */
    function updateMaxUsersPerBlock(uint64 _maxUsersPerBlock) public virtual onlyRecoveryAddress {
        if (_maxUsersPerBlock <= maxUsersPerBlock) revert MaxUsersPerBlockCanOnlyBeIncremented();
        maxUsersPerBlock = _maxUsersPerBlock;
        emit MaxUsersPerBlockUpdated(maxUsersPerBlock);
    }

    /**
     * @notice Gets current spot price from HyperCore precompile.
     * @param _spotPairId The spot pair ID to query
     * @return Raw spot price with protocol-specific decimal encoding
     */
    function _spotPx(uint64 _spotPairId) internal view returns (uint64) {
        (bool success, bytes memory result) = SPOT_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(_spotPairId));
        require(success, "SpotPx precompile call failed");
        return abi.decode(result, (uint64));
    }

    /**
     * @notice Gets spot pair info from HyperCore precompile.
     * @param _spotPairId Spot pair ID to query
     * @return `SpotInfo` containing pair name and token indices
     */
    function _spotInfo(uint64 _spotPairId) internal view returns (SpotInfo memory) {
        (bool success, bytes memory result) = SPOT_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(_spotPairId));
        require(success, "SpotInfo precompile call failed");
        return abi.decode(result, (SpotInfo));
    }

    /**
     * @notice Gets token metadata from HyperCore precompile.
     * @param _coreIndex Core token index to query
     * @return `TokenInfo` with token metadata and decimal configurations
     */
    function _tokenInfo(uint64 _coreIndex) internal view returns (TokenInfo memory) {
        (bool success, bytes memory result) = TOKEN_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(_coreIndex));
        require(success, "TokenInfo precompile call failed");
        return abi.decode(result, (TokenInfo));
    }

    /**
     * @dev Underflows if `_coreAmount < activationFee()`.
     * @inheritdoc FeeToken
     */
    function _getFinalCoreAmount(
        address _to,
        uint64 _coreAmount
    ) internal view virtual override(FeeToken, HyperLiquidComposer) returns (uint64) {
        return FeeToken._getFinalCoreAmount(_to, _coreAmount);
    }
}
