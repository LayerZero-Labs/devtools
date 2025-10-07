// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { VaultComposerSyncE2ETest } from "../vault-sync/VaultComposerSync_E2E.t.sol";
import { VaultComposerSyncNativeBaseTest } from "./VaultComposerSyncNative_Base.t.sol";

contract VaultComposerSyncNativeE2ETest is VaultComposerSyncE2ETest, VaultComposerSyncNativeBaseTest {
    using OptionsBuilder for bytes;

    function setUp() public virtual override (VaultComposerSyncE2ETest, VaultComposerSyncNativeBaseTest) {
        super.setUp();
        vm.deal(userA, 100 ether);
    }
}
