// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct SpotInfo {
    string name;
    uint64[2] tokens;
}

struct TokenInfo {
    string name;
    uint64[] spots;
    uint64 deployerTradingFeeShare;
    address deployer;
    address evmContract;
    uint8 szDecimals;
    uint8 weiDecimals;
    int8 evmExtraWeiDecimals;
}

interface IPreFundedFeeAbstraction {
    /// @notice Spot pair base asset does not match ERC20 core asset.
    error InvalidSpotPair();
    /// @notice Minimum USD amount greater than `uint64` max.
    error MinUSDAmtGreaterThanU64Max();
    /// @notice Activation overhead fee must be greater than 0.
    error ZeroActivationOverheadFee();
    /// @notice Quote asset decimals exceed safe limit for activation fee calculation.
    error ExcessiveDecimalDifference();
    /// @notice HYPE activation is not allowed.
    error HYPEActivationNotAllowed();
    /// @notice Max users can only be incremented.
    error MaxUsersPerBlockCanOnlyBeIncremented();
    /// @notice Cannot activate on fee withdrawal block.
    error CannotActivateOnFeeWithdrawalBlock();
    /// @notice Insufficient core balance for activation.
    error InsufficientCoreBalance(uint64 coreBalance, uint256 requiredCoreBalance);
    /// @notice Spot price exceeds activation fee numerator, which would cause fee to round to zero.
    error PriceExceedsActivationFeeNumerator(uint64 rawPrice);

    /**
     * @notice Emitted when activation fee is collected.
     * @param user Address to be activated in HyperCore.
     * @param amount Activation fee collected in core asset decimals (base asset units).
     */
    event FeeCollected(address indexed user, uint256 amount);

    /// @notice Emitted when max users per block is updated.
    event MaxUsersPerBlockUpdated(uint64 maxUsersPerBlock);

    function ACTIVATION_COST() external view returns (uint64);
    function SPOT_PAIR_ID() external view returns (uint64);
    function QUOTE_ASSET_INDEX() external view returns (uint64);
    function QUOTE_ASSET_DECIMALS() external view returns (uint64);
    function SPOT_PRICE_DECIMALS() external view returns (uint64);
    function ACTIVATION_FEE_NUMERATOR() external view returns (uint128);

    function maxUsersPerBlock() external view returns (uint64);
    function feeWithdrawalBlockNumber() external view returns (uint256);

    /**
     * @notice Retrieves quote tokens from HyperCore to a specified address
     * @dev Transfers quote tokens from the composer's HyperCore balance to the specified address
     * @dev Can only be called by the recovery address
     * @param coreAmount Amount of quote tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     * @param to Destination address to receive the retrieved quote tokens
     */
    function retrieveQuoteTokens(uint64 coreAmount, address to) external;

    function updateMaxUsersPerBlock(uint64 maxUsersPerBlock) external;
}
