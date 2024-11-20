// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { OFTAdapterAlt } from "../../contracts/OFTAdapterAlt.sol";
import { OFTAdapterAltMock } from "../mocks/OFTAdapterAltMock.sol";

// @title OFTAdapterAltMockCodec
// @notice Codec to convert OFTAdapterAlt to OFTAdapterMock / OFTFeeAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTAdapterAltMockCodec {
    function asOFTAdapterAltMock(OFTAdapterAlt _oft) internal pure returns (OFTAdapterAltMock) {
        return OFTAdapterAltMock(address(_oft));
    }
}
