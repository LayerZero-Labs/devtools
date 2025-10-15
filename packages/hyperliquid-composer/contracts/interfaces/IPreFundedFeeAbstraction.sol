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

    /**
     * @notice Emitted when activation fee is collected.
     * @param user Address to be activated in HyperCore.
     * @param amount Activation fee collected in quote asset decimals.
     */
    event FeeCollected(address indexed user, uint256 amount);

    function SPOT_PAIR_ID() external view returns (uint64);
    function QUOTE_ASSET_INDEX() external view returns (uint64);
    function QUOTE_ASSET_DECIMALS() external view returns (uint64);
    function SPOT_PRICE_DECIMALS() external view returns (uint64);
    function ACTIVATION_COST() external view returns (uint64);
}
