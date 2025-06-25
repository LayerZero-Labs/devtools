// SPDX-LICENSE-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { NativeOFTAdapterUpgradeable } from "../../contracts/oft/NativeOFTAdapterUpgradeable.sol";
import { NativeOFTAdapterUpgradeableMock } from "../mocks/NativeOFTAdapterUpgradeableMock.sol";

// @title NativeOFTAdapterUpgradeableMockCodec
// @notice Codec to convert NativeOFTAdapterUpgradeable to NativeOFTAdapterUpgradeableMock in a consistent, readable manner.
// @dev For testing purposes only.
library NativeOFTAdapterUpgradeableMockCodec {
    function asNativeOFTAdapterUpgradeableMock(NativeOFTAdapterUpgradeable _oft) internal pure returns (NativeOFTAdapterUpgradeableMock) {
        return NativeOFTAdapterUpgradeableMock(payable(address(_oft)));
    }
} 