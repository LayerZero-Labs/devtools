// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract HyperLiquidConstants {
    // Chain IDs
    // https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm#mainnet
    uint256 internal constant HYPE_CHAIN_ID_TESTNET = 998;
    uint256 internal constant HYPE_CHAIN_ID_MAINNET = 999;

    // Core Indexes
    // https://app.hyperliquid-testnet.xyz/explorer/token/0x7317beb7cceed72ef0b346074cc8e7ab
    uint64 internal constant HYPE_INDEX_TESTNET = 1105;
    // https://app.hyperliquid.xyz/explorer/token/0x0d01dc56dcaaca66ad901c959b4011ec
    uint64 internal constant HYPE_INDEX_MAINNET = 150;

    // Decimal Constants
    uint8 internal constant HYPE_EVM_DECIMALS = 18;
    uint8 internal constant HYPE_CORE_DECIMALS = 8;
    int64 internal constant HYPE_DECIMAL_DIFF = int64(uint64(HYPE_EVM_DECIMALS - HYPE_CORE_DECIMALS));

    // Precompile Addresses
    address internal constant HLP_CORE_WRITER = 0x3333333333333333333333333333333333333333;
    address internal constant HLP_PRECOMPILE_READ_SPOT_BALANCE = 0x0000000000000000000000000000000000000801;
    address internal constant HYPE_SYSTEM_CONTRACT = 0x2222222222222222222222222222222222222222;

    bytes public constant CORE_WRITER_VERSION = hex"01";
    bytes public constant SPOT_SEND_ACTION_ID = hex"000006";
    bytes public constant SPOT_SEND_HEADER = abi.encodePacked(CORE_WRITER_VERSION, SPOT_SEND_ACTION_ID); // 0x01000006
}
