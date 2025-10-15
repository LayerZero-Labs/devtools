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
    error InvalidSpot();
    error MinUSDAmtGreaterThanU64Max();
    error NoFeesToConvert();

    event FeeCollected(uint256 amount);

    /// Immutable variables
    function SPOT_PAIR_ID() external view returns (uint64);
    function QUOTE_ASSET_INDEX() external view returns (uint64);
    function QUOTE_ASSET_WEI_DECIMALS() external view returns (uint8);
    function SPOT_PRICE_DECIMALS() external view returns (uint64);
    function ACTIVATION_COST() external view returns (uint64);

    function getAccruedFeeUsdValue() external view returns (uint256);
    function retrieveAccruedFees(uint64 _coreAmount, address _to) external;

    function MIN_USD_PRE_FUND_WEI_VALUE() external view returns (uint64);
    function MIN_USD_PRE_FUND_AMOUNT() external view returns (uint64);
}
