// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OFT } from "../../contracts/OFT.sol";
import { OFTMock } from "../mocks/OFTMock.sol";

// @title OFTMockCodec
// @notice Codec to convert OFT to OFTMock / OFTFeeMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTMockCodec {
    function asOFTMock(OFT _oft) internal pure returns (OFTMock) {
        return OFTMock(address(_oft));
    }

    function asIERC20(OFT _oft) internal pure returns (IERC20) {
        return IERC20(address(_oft));
    }
}
