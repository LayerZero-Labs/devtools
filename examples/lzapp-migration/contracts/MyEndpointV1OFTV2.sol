// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { OFTV2 } from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";

/// @title MyEndpointV1OFTV2
/// @notice **This contract is an EndpointV1 OFT implementation** and should not be used for new OFT deployments.
/// @dev The name `OFTV2`refers to the V2 implementation of the OFT on **LayerZero EndpointV1** and **not** **LayerZero EndpointV2**
///      The `solidity-examples` repo is exclusively for EndpointV1 OFT 
contract MyEndpointV1OFTV2 is OFTV2 {
    /// @notice Initializes an OFT token with LayerZero's EndpointV1.
    /// @param _name The name of the token.
    /// @param _symbol The symbol of the token.
    /// @param _sharedDecimals The number of shared decimals for cross-chain transfers.
    /// @param _lzEndpoint The address of the LayerZero endpoint.
    /// @param _owner The owner of the contract.
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _sharedDecimals,
        address _lzEndpoint,
        address _owner
    ) OFTV2(_name, _symbol, _sharedDecimals, _lzEndpoint) {}
}
