// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { IExecutor } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutor.sol";

/// @title IExecutorWithEndpoint
/// @dev This interface extends the default executor interface to include the endpoint address.
/// @notice The default executor interface does not export the endpoint address.
interface IExecutorWithEndpoint is IExecutor {
    /// @notice Returns the endpoint address
    /// @return The address of the endpoint
    function endpoint() external view returns (address);
}
