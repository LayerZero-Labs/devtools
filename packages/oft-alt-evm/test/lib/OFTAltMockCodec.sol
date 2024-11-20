// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OFTAlt } from "../../contracts/OFTAlt.sol";
import { OFTAltMock } from "../mocks/OFTAltMock.sol";

// @title OFTAltMockCodec
// @notice Codec to convert OFT to OFTMock / OFTFeeMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTAltMockCodec {
    function asOFTAltMock(OFTAlt _oft) internal pure returns (OFTAltMock) {
        return OFTAltMock(address(_oft));
    }

    function asIERC20(OFTAlt _oft) internal pure returns (IERC20) {
        return IERC20(address(_oft));
    }
}
