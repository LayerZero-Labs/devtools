// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { OFTAdapter } from "../../contracts/OFTAdapter.sol";
import { OFTAdapterMock } from "../mocks/OFTAdapterMock.sol";

// @title OFTAdapterMockCodec
// @notice Codec to convert OFTAdapter to OFTAdapterMock / OFTFeeAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTAdapterMockCodec {
    function asOFTAdapterMock(OFTAdapter _oft) internal pure returns (OFTAdapterMock) {
        return OFTAdapterMock(address(_oft));
    }
}
