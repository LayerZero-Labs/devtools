// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { VaultComposerSyncUnitTest } from "../vault-sync/VaultComposerSync_Unit.t.sol";
import { VaultComposerSyncNativeBaseTest } from "./VaultComposerSyncNative_Base.t.sol";

contract VaultComposerSyncNativeUnitTest is VaultComposerSyncUnitTest, VaultComposerSyncNativeBaseTest {
    function _feedAssets(address _addr, uint256 _amount) internal override {
        /// @dev Send tokens from Asset OFT so that composer converts them to WETH.
        vm.deal(address(assetOFT_arb), _amount);
        vm.prank(address(assetOFT_arb));
        (bool success,) = _addr.call{ value: _amount }("");
        assertTrue(success, "Failed to feed composer with assets");
    }

    function _getUndustedAssetAmount(uint256 _amount) internal pure override returns (uint256) {
        return _amount;
    }

    function setUp() public virtual override (VaultComposerSyncUnitTest, VaultComposerSyncNativeBaseTest) {
        super.setUp();
    }
}
