// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { VaultComposerSyncE2ETest } from "../vault-sync/VaultComposerSync_E2E.t.sol";
import { VaultComposerSyncNativeBaseTest } from "./VaultComposerSyncNative_Base.t.sol";

contract VaultComposerSyncNativeE2ETest is VaultComposerSyncE2ETest, VaultComposerSyncNativeBaseTest {
    function setUp() public virtual override (VaultComposerSyncE2ETest, VaultComposerSyncNativeBaseTest) {
        super.setUp();
    }
}
