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
    error ActivationCostTooLow();
    error ActivationFeeTooHigh();
    error NoFeesToConvert();

    event FeeCollected(uint256 amount);

    /// Immutable variables
    function SPOT_ID() external view returns (uint64);

    function getAccruedFeeUsdValue() external view returns (uint64);
    function retrieveAccruedFees(uint64 _coreAmount, address _to) external;
}
