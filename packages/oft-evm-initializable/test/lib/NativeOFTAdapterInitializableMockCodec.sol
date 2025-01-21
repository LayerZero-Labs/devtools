// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import { NativeOFTAdapterInitializable } from "../../contracts/NativeOFTAdapterInitializable.sol";
import { NativeOFTAdapterInitializableMock } from "../mocks/NativeOFTAdapterInitializableMock.sol";

// @title NativeOFTAdapterMockCodec
// @notice Codec to convert NativeOFTAdapter to NativeOFTAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library NativeOFTAdapterInitializableMockCodec {
    function asNativeOFTAdapterInitializableMock(NativeOFTAdapterInitializable _oft) internal pure returns (NativeOFTAdapterInitializableMock) {
        return NativeOFTAdapterInitializableMock(address(_oft));
    }
}
