// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHyperLiquidWritePrecompile {
    event IocOrder(address indexed user, uint32 asset, bool isBuy, uint64 limitPx, uint64 sz);
    event VaultTransfer(address indexed user, address indexed vault, bool isDeposit, uint64 usd);
    event TokenDelegate(address indexed user, address indexed validator, uint64 _wei, bool isUndelegate);
    event CDeposit(address indexed user, uint64 _wei);
    event CWithdrawal(address indexed user, uint64 _wei);
    event SpotSend(address indexed user, address indexed destination, uint64 token, uint64 _wei);
    event UsdClassTransfer(address indexed user, uint64 ntl, bool toPerp);

    function sendIocOrder(uint32 asset, bool isBuy, uint64 limitPx, uint64 sz) external;

    function sendVaultTransfer(address vault, bool isDeposit, uint64 usd) external;

    function sendTokenDelegate(address validator, uint64 _wei, bool isUndelegate) external;

    function sendCDeposit(uint64 _wei) external;

    function sendCWithdrawal(uint64 _wei) external;

    function sendSpot(address destination, uint64 token, uint64 _wei) external;

    function sendUsdClassTransfer(uint64 ntl, bool toPerp) external;
}
