// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTMock } from "@layerzerolabs/oft-evm/test/mocks/OFTMock.sol";
import { OFTFeeUpgradeableMock } from "../mocks/OFTFeeUpgradeableMock.sol";

// @title OFTMockCodec
// @notice Codec to convert OFT to OFTMock / OFTFeeUpgradeableMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTMockCodec {
    function asOFTMock(OFT _oft) internal pure returns (OFTMock) {
        return OFTMock(address(_oft));
    }

    function asOFTFeeUpgradeableMock(OFT _oft) internal pure returns (OFTFeeUpgradeableMock) {
        return OFTFeeUpgradeableMock(address(_oft));
    }

    function asIERC20(OFT _oft) internal pure returns (IERC20) {
        return IERC20(address(_oft));
    }
}