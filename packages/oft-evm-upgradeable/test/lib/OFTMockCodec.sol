// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { OFTUpgradeableMock } from "../mocks/OFTUpgradeableMock.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { OFTFeeUpgradeableMock } from "../mocks/OFTFeeUpgradeableMock.sol";

// @title OFTMockCodec
// @notice Codec to convert OFT to OFTMock / OFTFeeUpgradeableMock in a consistent, readable manner.
// @dev For testing purposes only.
library OFTMockCodec {
    function asOFTFeeUpgradeableMock(OFTUpgradeableMock _oft) internal pure returns (OFTFeeUpgradeableMock) {
        return OFTFeeUpgradeableMock(address(_oft));
    }

    function asIERC20(OFTUpgradeableMock _oft) internal pure returns (IERC20) {
        return IERC20(address(_oft));
    }
}