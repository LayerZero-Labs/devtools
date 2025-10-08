// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppOptionsType3.sol";

import { VaultComposerSyncNative } from "../../contracts/VaultComposerSyncNative.sol";
import { VaultComposerSyncBaseTest } from "../vault-sync/VaultComposerSync_Base.t.sol";

import { MockOFT, MockOFTAdapter, MockNativeOFTAdapter } from "../mocks/MockOFT.sol";
import { MockVault } from "../mocks/MockVault.sol";
import { MockWETH } from "../mocks/MockWETH.sol";

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract VaultComposerSyncNativeBaseTest is VaultComposerSyncBaseTest {
    using OptionsBuilder for bytes;

    /// @dev Identical to `VaultComposerSyncNativeBaseTest.setUp()` except for the custom NatSpec lines.
    function setUp() public virtual override {
        TestHelperOz5.setUp();
        setUpEndpoints(subMeshSize, LibraryType.UltraLightNode);

        arbEndpoint = address(endpoints[ARB_EID]);

        weth = new MockWETH();
        vm.deal(address(weth), 100 ether);

        vm.deal(userA, 100 ether);

        /// @dev Deploy the Asset OFT (we can expect them to exist before we deploy the composer)
        /// @custom:changed-line
        assetOFT_arb = MockOFT(address(new MockNativeOFTAdapter(18, address(endpoints[ARB_EID]), address(this))));
        /// @custom:changed-line
        assetToken_arb = weth;
        assetOFT_eth = new MockOFT("ethAsset", "ethAsset", address(endpoints[ETH_EID]), address(this));
        assetOFT_pol = new MockOFT("polAsset", "polAsset", address(endpoints[POL_EID]), address(this));

        // config and wire the ofts
        address[] memory assetOFTs = new address[](subMeshSize);
        assetOFTs[0] = address(assetOFT_eth);
        assetOFTs[1] = address(assetOFT_arb);
        assetOFTs[2] = address(assetOFT_pol);
        this.wireOApps(assetOFTs);

        /// Now the "expansion" is for the arb vault and share ofts on other networks.
        vault_arb = new MockVault("arbShare", "arbShare", address(assetToken_arb));
        shareOFT_arb = new MockOFTAdapter(address(vault_arb), address(endpoints[ARB_EID]), address(this));
        /// @custom:changed-line
        vaultComposer = new VaultComposerSyncNative(address(vault_arb), address(assetOFT_arb), address(shareOFT_arb));

        /// Deploy the Share OFTs on other networks - these are NOT lockbox adapters.
        shareOFT_eth = new MockOFT("ethShare", "ethShare", address(endpoints[ETH_EID]), address(this));
        shareOFT_pol = new MockOFT("polShare", "polShare", address(endpoints[POL_EID]), address(this));

        address[] memory shareOFTs = new address[](subMeshSize);
        shareOFTs[0] = address(shareOFT_eth);
        shareOFTs[1] = address(shareOFT_arb);
        shareOFTs[2] = address(shareOFT_pol);
        this.wireOApps(shareOFTs);

        /// @custom:changed-line
        vm.label(address(assetOFT_arb), "AssetNativeOFTAdapter::arb");
        /// @custom:added-line
        vm.label(address(assetToken_arb), "AssetToken::arb");
        vm.label(address(assetOFT_eth), "AssetOFT::eth");
        vm.label(address(assetOFT_pol), "AssetOFT::pol");

        vm.label(address(shareOFT_arb), "ShareOFTAdapter::arb");
        vm.label(address(shareOFT_eth), "ShareOFT::eth");
        vm.label(address(shareOFT_pol), "ShareOFT::pol");

        vm.label(address(vault_arb), "Vault::arb");
        /// @custom:changed-line
        vm.label(address(vaultComposer), "VaultComposerSyncNative::arb");

        deal(arbExecutor, INITIAL_BALANCE);
        deal(arbEndpoint, INITIAL_BALANCE);

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](3);
        enforcedOptions[0] = EnforcedOptionParam({ eid: POL_EID, msgType: 1, options: OPTIONS_LZRECEIVE_100k });
        enforcedOptions[1] = EnforcedOptionParam({ eid: ARB_EID, msgType: 1, options: OPTIONS_LZRECEIVE_100k });
        enforcedOptions[2] = EnforcedOptionParam({ eid: ETH_EID, msgType: 1, options: OPTIONS_LZRECEIVE_100k });

        assetOFT_arb.setEnforcedOptions(enforcedOptions);
        assetOFT_eth.setEnforcedOptions(enforcedOptions);
        assetOFT_pol.setEnforcedOptions(enforcedOptions);

        shareOFT_arb.setEnforcedOptions(enforcedOptions);
        shareOFT_eth.setEnforcedOptions(enforcedOptions);
        shareOFT_pol.setEnforcedOptions(enforcedOptions);
    }
}
