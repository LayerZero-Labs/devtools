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
    uint8 constant MAX_SPOT_PRICE_DECIMALS = 8;

    /// @dev Hyperliquid protocol requires 1 quote token for activation
    uint64 constant BASE_ACTIVATION_FEE_CENTS = 100;

    uint8 constant DEFAULT_MIN_USDC_PRE_FUND_AMOUNT = 20;

    /// @dev Total activation cost in quote token wei (base + overhead)
    uint64 public immutable ACTIVATION_COST;

    uint64 public immutable SPOT_ID;
    uint64 public immutable QUOTE_ASSET_INDEX;

    /// @dev Pre-calculated spot price decimals for gas efficiency: (8 - szDecimals)
    uint8 public immutable SPOT_PRICE_DECIMALS;

    /// @dev Activation fee are collected in the base asset and can be retrieved by recovery address
    /// @dev Amount is denoted in HyperCore decimals
    uint64 public accruedActivationFee;

    /**
     * @notice Constructor for the PreFundedFeeAbstraction extension
     * @param _spotId The spot pair ID for the asset/quote pair (e.g., 107 for HYPE/USDC)
     * @param _activationOverheadFee The activation overhead fee in cents on top of $1 base (e.g., 50 = 50 cents = $0.50 overhead)
     */
    constructor(uint64 _spotId, uint16 _activationOverheadFee) {
        uint64[2] memory tokens = _spotInfo(_spotId).tokens;
        uint64 assetIndex = tokens[0];
        QUOTE_ASSET_INDEX = tokens[1];

        /// @dev The spot ID is NOT the same as the core asset index
        /// @dev Example: HYPE has core index 150 but HYPE/USDC has spot ID 107
        if (assetIndex != ERC20_CORE_INDEX_ID) revert InvalidSpot();
        SPOT_ID = _spotId;

        TokenInfo memory baseAssetInfo = _tokenInfo(assetIndex);
        TokenInfo memory quoteAssetInfo = _tokenInfo(QUOTE_ASSET_INDEX);

        /// @dev Hyperliquid protocol uses (8 - szDecimals) for spot price decimal encoding
        SPOT_PRICE_DECIMALS = MAX_SPOT_PRICE_DECIMALS - baseAssetInfo.szDecimals;

        uint64 totalCentsAmount = BASE_ACTIVATION_FEE_CENTS + _activationOverheadFee;
        ACTIVATION_COST = uint64((totalCentsAmount * (10 ** quoteAssetInfo.weiDecimals)) / 100);
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
        if (coreUserExists(_to).exists) return _coreAmount;

        uint64 fee = activationFee();
        if (_coreAmount <= fee) revert InsufficientCoreAmountForActivation();
        return _coreAmount - fee;
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

            if (!coreUserExists(_to).exists) {
                uint64 feeCollected = originalAmount - coreAmount;
                accruedActivationFee += feeCollected;
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
        uint64 rawPrice = _spotPx();

        return uint64((ACTIVATION_COST * (10 ** SPOT_PRICE_DECIMALS)) / rawPrice);
    }

    /**
     * @notice Estimates USD value of accumulated fees using current spot price
     * @return USD value in quote token terms
     */
    function getAccruedFeeUsdValue() public view returns (uint64) {
        if (accruedActivationFee == 0) return 0;

        uint64 rawPrice = _spotPx();
        return uint64((rawPrice * accruedActivationFee) / (10 ** SPOT_PRICE_DECIMALS));
    }

    /**
     * @notice Transfers accumulated fees to specified address for external liquidation
     * @dev Permissioned call by the recovery address
     * @param _coreAmount Amount to transfer in core decimals, or FULL_TRANSFER for all
     * @param _to Destination address on HyperCore
     */
    function retrieveAccruedFees(uint64 _coreAmount, address _to) external onlyRecoveryAddress {
        if (accruedActivationFee == 0) revert NoFeesToConvert();

        uint64 transferAmount = _coreAmount == FULL_TRANSFER ? accruedActivationFee : _coreAmount;

        if (transferAmount > accruedActivationFee) {
            revert MaxRetrieveAmountExceeded(accruedActivationFee, transferAmount);
        }

        accruedActivationFee -= transferAmount;
        _submitCoreWriterTransfer(_to, ERC20_CORE_INDEX_ID, transferAmount);

        emit Retrieved(ERC20_CORE_INDEX_ID, transferAmount, _to);
    }

    function retrieveCoreUSDC(uint64 _coreAmount, address _to) public virtual override onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(USDC_CORE_INDEX, _coreAmount);
        uint64 minComposerBalance = MIN_USDC_PRE_FUND_AMOUNT();

        if (maxTransferAmt > minComposerBalance) {
            revert MaxRetrieveAmountExceeded(minComposerBalance, maxTransferAmt);
        }

        _submitCoreWriterTransfer(_to, USDC_CORE_INDEX, maxTransferAmt);
        emit Retrieved(USDC_CORE_INDEX, maxTransferAmt, _to);
    }

    /**
     * @notice Gets current spot price from HyperCore precompile
     * @return Raw spot price with protocol-specific decimal encoding
     */
    function _spotPx() internal view returns (uint64) {
        bool success;
        bytes memory result;
        (success, result) = SPOT_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(SPOT_ID));
        require(success, "SpotPx precompile call failed");
        return abi.decode(result, (uint64));
    }

    /**
     * @notice Gets spot pair info from HyperCore precompile
     * @param _spot Spot pair ID to query
     * @return SpotInfo containing pair name and token indices
     */
    function _spotInfo(uint64 _spot) internal view returns (SpotInfo memory) {
        bool success;
        bytes memory result;
        (success, result) = SPOT_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(_spot));
        require(success, "SpotInfo precompile call failed");
        return abi.decode(result, (SpotInfo));
    }

    /**
     * @notice Gets token metadata from HyperCore precompile
     * @param _coreSpotIndex Core token index to query
     * @return TokenInfo with token metadata and decimal configurations
     */
    function _tokenInfo(uint64 _coreSpotIndex) internal view returns (TokenInfo memory) {
        bool success;
        bytes memory result;
        (success, result) = TOKEN_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(_coreSpotIndex));
        require(success, "TokenInfo precompile call failed");
        return abi.decode(result, (TokenInfo));
    }

    /**
     * @notice Returns the minimum activation cost threshold in USD terms
     * @dev Can be overridden by implementing contracts to adjust minimum fee requirements
     * @return The minimum USD amount required for activation fees
     */
    function MIN_USDC_PRE_FUND_AMOUNT() public pure virtual returns (uint8) {
        return DEFAULT_MIN_USDC_PRE_FUND_AMOUNT;
    }
}
