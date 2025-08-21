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

    // Decimal Constants - Pre-computed for gas efficiency
    uint8 internal constant HYPE_EVM_DECIMALS = 18;
    uint8 internal constant HYPE_CORE_DECIMALS = 8;
    int64 internal constant HYPE_DECIMAL_DIFF = 10; // Pre-computed: 18 - 8
    uint256 internal constant HYPE_SCALE_FACTOR = 10 ** 10; // Pre-computed: 10^(18-8)

    // Precompile Addresses
    address internal constant HLP_CORE_WRITER = 0x3333333333333333333333333333333333333333;
    address internal constant HLP_PRECOMPILE_READ_SPOT_BALANCE = 0x0000000000000000000000000000000000000801;
    address internal constant HYPE_SYSTEM_CONTRACT = 0x2222222222222222222222222222222222222222;

    // Pre-computed headers for gas efficiency
    bytes1 public constant CORE_WRITER_VERSION = 0x01;
    bytes3 public constant SPOT_SEND_ACTION_ID = 0x000006;
    bytes4 public constant SPOT_SEND_HEADER = 0x01000006; // Pre-computed concatenation
}
