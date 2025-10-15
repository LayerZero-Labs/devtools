// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { HyperLiquidComposer } from "../HyperLiquidComposer.sol";
import { HyperLiquidComposerCodec } from "../library/HyperLiquidComposerCodec.sol";
import { FeeToken } from "../extensions/FeeToken.sol";
import { RecoverableComposer } from "../extensions/RecoverableComposer.sol";
import { IHyperAssetAmount } from "../interfaces/IHyperLiquidComposer.sol";

import { IPreFundedFeeAbstraction, SpotInfo, TokenInfo } from "../interfaces/IPreFundedFeeAbstraction.sol";

/**
 * @title PreFunded Fee Abstraction
 * @author LayerZero Labs (@shankars99)
 * @notice Extension that eliminates the need for pre-funding composers with USDC by using deposited assets for activation fees
 * @dev Instead of maintaining separate balances for activation, this extension deducts fees from user deposits in their native asset
 * @dev The composer calculates USD-equivalent fee amounts using real-time HyperCore spot prices and asset conversion
 * @dev Accumulated fees are tracked and can be retrieved by the recovery address for external liquidation
 */
abstract contract PreFundedFeeAbstraction is FeeToken, RecoverableComposer, IPreFundedFeeAbstraction {
    using SafeERC20 for IERC20;

    address internal constant SPOT_PX_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000808;
    address internal constant SPOT_INFO_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080b;
    address internal constant TOKEN_INFO_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080C;

    /// @dev Hyperliquid protocol constant: spot prices use MAX_DECIMALS of 8
    uint8 internal constant SPOT_PRICE_MAX_DECIMALS = 8;

    /// @dev Hyperliquid protocol requires 1 quote token for activation
    uint64 internal constant BASE_ACTIVATION_FEE_CENTS = 100;

    /// @dev US Dollar value of the minimum pre-fund amount. Not scaled to core spot decimals.
    /// @dev The maximum number of transactions that can be fit in a single block
    /// @dev This is because spotBalance returns the same value for all transactions in a block
    uint64 private constant DEFAULT_MIN_USD_PRE_FUND_AMOUNT = 25;

    /// @dev Total activation cost in quote token wei (base + overhead). Scaled to core spot decimals.
    uint64 public immutable ACTIVATION_COST;

    uint64 public immutable SPOT_PAIR_ID;
    uint64 public immutable QUOTE_ASSET_INDEX;
    uint64 public immutable QUOTE_ASSET_DECIMALS;

    /// @dev Pre-calculated spot price decimals for gas efficiency: (8 - szDecimals)
    uint64 public immutable SPOT_PRICE_DECIMALS;

    /// @dev Activation fee are collected in the base asset and can be retrieved by recovery address
    /// @dev Amount is denoted in HyperCore decimals
    uint64 public accruedActivationFees;

    /**
     * @notice Constructor for the PreFundedFeeAbstraction extension
     * @param _spotPairId The spot pair ID for the asset/quote pair (e.g., 107 for HYPE/USDC)
     * @param _activationOverheadFee The activation overhead fee in cents on top of $1 base (e.g., 50 = 50 cents = $0.50 overhead)
     */
    constructor(uint64 _spotPairId, uint16 _activationOverheadFee) {
        uint64[2] memory tokens = _spotInfo(_spotPairId).tokens;
        uint64 assetIndex = tokens[0];
        QUOTE_ASSET_INDEX = tokens[1];

        /// @dev The spot ID is NOT the same as the core asset index
        /// @dev Example: HYPE has core index 150 but HYPE/USDC has spot ID 107
        if (assetIndex != ERC20_CORE_INDEX_ID) revert InvalidSpot();
        SPOT_PAIR_ID = _spotPairId;

        TokenInfo memory baseAssetInfo = _tokenInfo(assetIndex);
        TokenInfo memory quoteAssetInfo = _tokenInfo(QUOTE_ASSET_INDEX);

        /// @dev Hyperliquid protocol uses (8 - szDecimals) for spot price decimal encoding
        SPOT_PRICE_DECIMALS = SPOT_PRICE_MAX_DECIMALS - baseAssetInfo.szDecimals;
        QUOTE_ASSET_DECIMALS = uint64(10 ** quoteAssetInfo.weiDecimals);

        uint64 totalCentsAmount = BASE_ACTIVATION_FEE_CENTS + _activationOverheadFee;
        ACTIVATION_COST = uint64((totalCentsAmount * QUOTE_ASSET_DECIMALS) / 100);

        if (MIN_USD_PRE_FUND_AMOUNT() * QUOTE_ASSET_DECIMALS > type(uint64).max) revert MinUSDAmtGreaterThanU64Max();
    }

    /**
     * @notice Override to track activation fees during transfers
     * @param _to Destination address on HyperCore
     * @param _amountLD Amount to transfer in LayerZero decimals
     */
    function _transferERC20ToHyperCore(address _to, uint256 _amountLD) internal virtual override {
        IHyperAssetAmount memory amounts = quoteHyperCoreAmount(
            ERC20_CORE_INDEX_ID,
            ERC20_DECIMAL_DIFF,
            ERC20_ASSET_BRIDGE,
            _amountLD
        );

        if (amounts.evm != 0) {
            uint64 originalAmount = amounts.core;
            uint64 coreAmount = _getFinalCoreAmount(_to, originalAmount);

            /// @dev When the user is not activated we collect the activation fee
            if (originalAmount > coreAmount) {
                uint64 coreBalance = spotBalance(address(this), QUOTE_ASSET_INDEX).total;
                if (coreBalance < MIN_USD_PRE_FUND_WEI_VALUE()) revert InsufficientCoreAmountForActivation();

                uint64 feeCollected = originalAmount - coreAmount;
                accruedActivationFees += feeCollected;
                emit FeeCollected(feeCollected);
            }

            IERC20(ERC20).safeTransfer(ERC20_ASSET_BRIDGE, amounts.evm);
            _submitCoreWriterTransfer(_to, ERC20_CORE_INDEX_ID, coreAmount);
        }
    }

    /**
     * @notice Calculates activation fee in asset tokens using current spot price
     * @return Activation fee amount in core asset decimals
     */
    function activationFee() public view virtual override returns (uint64) {
        uint64 rawPrice = _spotPx(SPOT_PAIR_ID);
        return uint64((ACTIVATION_COST * (10 ** SPOT_PRICE_DECIMALS)) / rawPrice);
    }

    /**
     * @notice Estimates USD value of accumulated fees using current spot price
     * @return USD value in quote token terms
     */
    function getAccruedFeeUsdValue() public view returns (uint256) {
        if (accruedActivationFees == 0) return 0;

        uint64 rawPrice = _spotPx(SPOT_PAIR_ID);
        return (rawPrice * accruedActivationFees) / (10 ** SPOT_PRICE_DECIMALS);
    }

    /**
     * @notice Transfers accumulated fees to specified address for external liquidation
     * @dev Permissioned call by the recovery address
     * @param _coreAmount Amount to transfer in core decimals, FULL_TRANSFER for max available
     * @param _to Destination address on HyperCore
     */
    function retrieveAccruedFees(uint64 _coreAmount, address _to) external onlyRecoveryAddress {
        if (accruedActivationFees == 0) revert NoFeesToConvert();

        uint64 transferAmount = _coreAmount == FULL_TRANSFER ? accruedActivationFees : _coreAmount;

        if (transferAmount > accruedActivationFees) {
            revert MaxRetrieveAmountExceeded(accruedActivationFees, transferAmount);
        }

        accruedActivationFees -= transferAmount;
        _submitCoreWriterTransfer(_to, ERC20_CORE_INDEX_ID, transferAmount);

        emit Retrieved(ERC20_CORE_INDEX_ID, transferAmount, _to);
    }

    /**
     * @notice Gets current spot price from HyperCore precompile
     * @param _spotPairId The spot pair ID to query
     * @return Raw spot price with protocol-specific decimal encoding
     */
    function _spotPx(uint64 _spotPairId) internal view returns (uint64) {
        bool success;
        bytes memory result;
        (success, result) = SPOT_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(_spotPairId));
        require(success, "SpotPx precompile call failed");
        return abi.decode(result, (uint64));
    }

    /**
     * @notice Gets spot pair info from HyperCore precompile
     * @param _spotPairId Spot pair ID to query
     * @return SpotInfo containing pair name and token indices
     */
    function _spotInfo(uint64 _spotPairId) internal view returns (SpotInfo memory) {
        bool success;
        bytes memory result;
        (success, result) = SPOT_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(_spotPairId));
        require(success, "SpotInfo precompile call failed");
        return abi.decode(result, (SpotInfo));
    }

    /**
     * @notice Gets token metadata from HyperCore precompile
     * @param _coreIndex Core token index to query
     * @return TokenInfo with token metadata and decimal configurations
     */
    function _tokenInfo(uint64 _coreIndex) internal view returns (TokenInfo memory) {
        bool success;
        bytes memory result;
        (success, result) = TOKEN_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(_coreIndex));
        require(success, "TokenInfo precompile call failed");
        return abi.decode(result, (TokenInfo));
    }

    /**
     * @notice Returns the minimum activation cost threshold in quote token wei terms
     * @dev Scaled to quote token wei decimals
     * @dev Can be overridden by implementing contracts to adjust minimum fee requirements
     * @return The minimum quote token wei amount required for activation fees
     */
    function MIN_USD_PRE_FUND_WEI_VALUE() public view virtual returns (uint64) {
        return uint64(MIN_USD_PRE_FUND_AMOUNT() * QUOTE_ASSET_DECIMALS);
    }

    /**
     * @notice Returns the minimum activation cost threshold in US Dollars
     * @dev NOT scaled to quote token wei decimals
     * @dev Can be overridden by implementing contracts to adjust minimum fee requirements
     * @return The minimum quote token wei amount required for activation fees
     */
    function MIN_USD_PRE_FUND_AMOUNT() public pure virtual returns (uint64) {
        return DEFAULT_MIN_USD_PRE_FUND_AMOUNT;
    }

    /**
     * @notice Deducts activation fee if user not activated, otherwise returns full amount
     * @param _to Destination address on HyperCore
     * @param _coreAmount Original core amount before fee deduction
     * @return Final core amount after potential fee deduction
     */
    function _getFinalCoreAmount(
        address _to,
        uint64 _coreAmount
    ) internal view virtual override(FeeToken, HyperLiquidComposer) returns (uint64) {
        return FeeToken._getFinalCoreAmount(_to, _coreAmount);
    }
}
