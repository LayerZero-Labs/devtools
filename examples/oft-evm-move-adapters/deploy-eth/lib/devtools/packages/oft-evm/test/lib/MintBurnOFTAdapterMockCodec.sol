// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import { MintBurnOFTAdapterMock } from "../mocks/MintBurnOFTAdapterMock.sol";
import { MintBurnOFTAdapter } from "../../contracts/MintBurnOFTAdapter.sol";

// @title MintBurnOFTAdapterMockCodec
// @notice Codec to convert MintBurnOFTAdapter to MintBurnOFTAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library MintBurnOFTAdapterMockCodec {
    function asMintBurnOFTAdapterMock(MintBurnOFTAdapter _oft) internal pure returns (MintBurnOFTAdapterMock) {
        return MintBurnOFTAdapterMock(address(_oft));
    }
}
