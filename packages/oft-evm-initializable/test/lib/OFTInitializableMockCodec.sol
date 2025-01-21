// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OFTInitializable } from "../../contracts/OFTInitializable.sol";
import { OFTInitializableMock } from "../mocks/OFTInitializableMock.sol";

// @title OFTMockCodec
// @notice Codec to convert OFT to OFTMock / OFTFeeMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTInitializableMockCodec {
    function asOFTInitializableMock(OFTInitializable _oft) internal pure returns (OFTInitializableMock) {
        return OFTInitializableMock(address(_oft));
    }

    function asIERC20(OFTInitializable _oft) internal pure returns (IERC20) {
        return IERC20(address(_oft));
    }
}
