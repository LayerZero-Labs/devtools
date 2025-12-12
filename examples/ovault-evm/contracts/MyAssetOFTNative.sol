// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { NativeOFTAdapter } from "@layerzerolabs/oft-evm/contracts/NativeOFTAdapter.sol";

/**
 * @title MyAssetOFTNative
 * @notice NativeOFTAdapter for issuing a bridged version of the chain's native asset (e.g., ETH, HYPE)
 *
 * @dev WARNING: Only use this if you plan on issuing a bridged version of the chain's native asset yourself.
 *      Most integrations should use existing native asset OFTs like `StargatePoolNative`.
 *
 * @dev WARNING: ONLY 1 NativeOFTAdapter should exist for a given global mesh, unless you make a
 *      non-default implementation, which needs to be done very carefully.
 *
 * @dev This contract adapts the chain's native currency to OFT functionality for cross-chain transfers.
 *      When used with MyOVaultComposerNative, the composer handles wrapping/unwrapping via WETH9 interface.
 *      - `token()` returns `address(0)` indicating native asset
 *      - `approvalRequired()` returns `false` since native transfers don't need ERC20 approval
 */
contract MyAssetOFTNative is NativeOFTAdapter {
    /**
     * @notice Constructs the Native Asset OFT Adapter
     * @dev Initializes the NativeOFTAdapter with LayerZero endpoint and sets up ownership
     * @param _localDecimals The decimals of the native token on this chain (18 for ETH, 18 for HYPE)
     * @param _lzEndpoint The address of the LayerZero endpoint on this chain
     * @param _delegate The address that will have owner privileges
     */
    constructor(
        uint8 _localDecimals,
        address _lzEndpoint,
        address _delegate
    ) NativeOFTAdapter(_localDecimals, _lzEndpoint, _delegate) Ownable(_delegate) {}
}
