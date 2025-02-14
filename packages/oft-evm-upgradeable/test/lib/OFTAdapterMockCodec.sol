// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { OFTAdapterMock } from "@layerzerolabs/oft-evm/test/mocks/OFTAdapterMock.sol";
import { OFTFeeAdapterMock } from "../mocks/OFTFeeAdapterMock.sol";

// @title OFTAdapterMockCodec
// @notice Codec to convert OFTAdapter to OFTAdapterMock / OFTFeeAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTAdapterMockCodec {
    function asOFTAdapterMock(OFTAdapter _oft) internal pure returns (OFTAdapterMock) {
        return OFTAdapterMock(address(_oft));
    }

    function asOFTFeeAdapterMock(OFTAdapter _oft) internal pure returns (OFTFeeAdapterMock) {
        return OFTFeeAdapterMock(address(_oft));
    }
}