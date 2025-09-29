// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import { MintSelfBurnOFTAdapterMock } from "../mocks/MintSelfBurnOFTAdapterMock.sol";
import { MintSelfBurnOFTAdapter } from "../../contracts/MintSelfBurnOFTAdapter.sol";

library MintSelfBurnOFTAdapterMockCodec {
    function asMintSelfBurnOFTAdapterMock(
        MintSelfBurnOFTAdapter _oft
    ) internal pure returns (MintSelfBurnOFTAdapterMock) {
        return MintSelfBurnOFTAdapterMock(address(_oft));
    }
}
