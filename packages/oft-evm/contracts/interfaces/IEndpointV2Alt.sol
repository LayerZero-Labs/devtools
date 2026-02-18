// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/// @notice Minimal interface for EndpointV2Alt to read nativeToken without importing the concrete contract.
interface IEndpointV2Alt {
    function nativeToken() external view returns (address);
}
