// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ICoreWriter } from "./interfaces/ICoreWriter.sol";

struct SpotBalance {
    uint64 total;
    uint64 hold;
    uint64 entryNtl;
}

struct CoreUserExists {
    bool exists;
}

abstract contract HyperLiquidCore {
    // Chain IDs
    // https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm#mainnet
    uint256 internal constant HYPE_CHAIN_ID_TESTNET = 998;
    uint256 internal constant HYPE_CHAIN_ID_MAINNET = 999;

    // Core Indexes
    // https://app.hyperliquid-testnet.xyz/explorer/token/0x7317beb7cceed72ef0b346074cc8e7ab
    uint64 internal constant HYPE_CORE_INDEX_TESTNET = 1105;
    // https://app.hyperliquid.xyz/explorer/token/0x0d01dc56dcaaca66ad901c959b4011ec
    uint64 internal constant HYPE_CORE_INDEX_MAINNET = 150;

    // Decimal Constants - Pre-computed for gas efficiency
    uint8 internal constant HYPE_EVM_DECIMALS = 18;
    uint8 internal constant HYPE_CORE_DECIMALS = 8;
    int64 internal constant HYPE_DECIMAL_DIFF = 10; // Pre-computed: 18 - 8
    address internal constant HYPE_ASSET_BRIDGE = 0x2222222222222222222222222222222222222222;
    uint256 internal constant HYPE_SCALE_FACTOR = 10 ** 10; // Pre-computed: 10^(18-8)

    // Precompile Addresses
    address internal constant HLP_CORE_WRITER = 0x3333333333333333333333333333333333333333;
    address internal constant SPOT_BALANCE_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000801;
    address internal constant CORE_USER_EXISTS_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000810;

    // Pre-computed headers for gas efficiency
    bytes1 public constant CORE_WRITER_VERSION = 0x01;
    bytes3 public constant SPOT_SEND_ACTION_ID = 0x000006;
    bytes4 public constant SPOT_SEND_HEADER = 0x01000006; // Pre-computed concatenation

    function spotBalance(address user, uint64 token) public view returns (SpotBalance memory) {
        bool success;
        bytes memory result;
        (success, result) = SPOT_BALANCE_PRECOMPILE_ADDRESS.staticcall(abi.encode(user, token));
        require(success, "SpotBalance precompile call failed");
        return abi.decode(result, (SpotBalance));
    }

    function coreUserExists(address user) public view returns (CoreUserExists memory) {
        bool success;
        bytes memory result;
        (success, result) = CORE_USER_EXISTS_PRECOMPILE_ADDRESS.staticcall(abi.encode(user));
        require(success, "Core user exists precompile call failed");
        return abi.decode(result, (CoreUserExists));
    }

    /**
     * @notice Transfers tokens on HyperCore using the CoreWriter precompile
     * @param _to The address to receive tokens on HyperCore
     * @param _coreIndex The core index of the token
     * @param _coreAmount The amount to transfer on HyperCore
     */
    function _submitCoreWriterTransfer(address _to, uint64 _coreIndex, uint64 _coreAmount) internal virtual {
        bytes memory action = abi.encode(_to, _coreIndex, _coreAmount);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        /// Transfers HYPE tokens from the composer address on HyperCore to the _to via the SpotSend precompile
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
    }
}
