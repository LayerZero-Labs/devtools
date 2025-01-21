// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { OFTAdapterInitializable } from "../../contracts/OFTAdapterInitializable.sol";
import { OFTAdapterInitializableMock } from "../mocks/OFTAdapterInitializableMock.sol";

// @title OFTAdapterMockCodec
// @notice Codec to convert OFTAdapter to OFTAdapterMock / OFTFeeAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTAdapterInitializableMockCodec {
    function asOFTAdapterMock(OFTAdapterInitializable _oft) internal pure returns (OFTAdapterInitializableMock) {
        return OFTAdapterInitializableMock(address(_oft));
    }
}
