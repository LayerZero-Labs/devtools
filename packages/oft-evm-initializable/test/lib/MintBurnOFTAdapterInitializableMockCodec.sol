// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import { MintBurnOFTAdapterInitializableMock } from "../mocks/MintBurnOFTAdapterInitializableMock.sol";
import { MintBurnOFTAdapterInitializable } from "../../contracts/MintBurnOFTAdapterInitializable.sol";

// @title MintBurnOFTAdapterMockCodec
// @notice Codec to convert MintBurnOFTAdapter to MintBurnOFTAdapterMock in a consistent, readable manner.
// @dev For testing purposes only.
library MintBurnOFTAdapterInitializableMockCodec {
    function asMintBurnOFTAdapterInitializableMock(MintBurnOFTAdapterInitializable _oft) internal pure returns (MintBurnOFTAdapterInitializableMock) {
        return MintBurnOFTAdapterInitializableMock(address(_oft));
    }
}
