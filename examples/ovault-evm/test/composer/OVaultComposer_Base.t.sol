// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// OApp imports
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { OVaultComposer } from "@layerzerolabs/ovault-evm/contracts/OVaultComposer.sol";

import { MockOFT } from "../mocks/MockOFT.sol";
import { MockOFTAdapter } from "../mocks/MockOFT.sol";
import { MockOVault } from "../mocks/MockOVault.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract OVaultComposerBaseTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint8 subMeshSize = 3;

    uint32 public constant ETH_EID = 1;
    uint32 public constant ARB_EID = 2;
    uint32 public constant POL_EID = 3;
    uint32 public constant BAD_EID = 101;

    MockOFT public assetOFT_arb;
    MockOFTAdapter public shareOFT_arb;

    MockOFT public assetOFT_eth;
    MockOFT public shareOFT_eth;

    MockOFT public assetOFT_pol;
    MockOFT public shareOFT_pol;

    MockOVault public oVault_arb;
    OVaultComposer public OVaultComposerArb;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    address public arbEndpoint;
    address public arbExecutor = makeAddr("arbExecutor");
    bytes public OPTIONS_LZRECEIVE_2M = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);

    uint256 public constant INITIAL_BALANCE = 100 ether;
    uint256 public constant TOKENS_TO_SEND = 1 ether;

    function setUp() public virtual override {
        super.setUp();
        setUpEndpoints(subMeshSize, LibraryType.UltraLightNode);

        arbEndpoint = address(endpoints[ARB_EID]);

        /// @dev Deploy the Asset OFT (we can expect them to exist before we deploy the OVaultComposer)
        assetOFT_arb = new MockOFT("arbAsset", "arbAsset", address(endpoints[ARB_EID]), address(this));
        assetOFT_eth = new MockOFT("ethAsset", "ethAsset", address(endpoints[ETH_EID]), address(this));
        assetOFT_pol = new MockOFT("polAsset", "polAsset", address(endpoints[POL_EID]), address(this));

        // config and wire the ofts
        address[] memory nativeMeshOFTs = new address[](subMeshSize);
        nativeMeshOFTs[0] = address(assetOFT_eth);
        nativeMeshOFTs[1] = address(assetOFT_arb);
        nativeMeshOFTs[2] = address(assetOFT_pol);
        this.wireOApps(nativeMeshOFTs);

        /// Now the "expansion" is for the arb vault and share ofts on other networks.
        oVault_arb = new MockOVault("arbShare", "arbShare", address(assetOFT_arb));
        shareOFT_arb = new MockOFTAdapter(address(oVault_arb), address(endpoints[ARB_EID]), address(this));
        OVaultComposerArb = new OVaultComposer(address(oVault_arb), address(assetOFT_arb), address(shareOFT_arb));

        /// Deploy the Share OFTs on other networks - these are NOT lockbox adapters.
        shareOFT_eth = new MockOFT("ethShare", "ethShare", address(endpoints[ETH_EID]), address(this));
        shareOFT_pol = new MockOFT("polShare", "polShare", address(endpoints[POL_EID]), address(this));

        address[] memory usdt0OFTs = new address[](subMeshSize);
        usdt0OFTs[0] = address(shareOFT_eth);
        usdt0OFTs[1] = address(shareOFT_arb);
        usdt0OFTs[2] = address(shareOFT_pol);
        this.wireOApps(usdt0OFTs);

        vm.label(address(assetOFT_arb), "AssetOFT::arb");
        vm.label(address(assetOFT_eth), "AssetOFT::eth");
        vm.label(address(assetOFT_pol), "AssetOFT::pol");

        vm.label(address(shareOFT_arb), "ShareOFTAdapter::arb");
        vm.label(address(shareOFT_eth), "ShareOFT::eth");
        vm.label(address(shareOFT_pol), "ShareOFT::pol");

        vm.label(address(oVault_arb), "OVault::arb");
        vm.label(address(OVaultComposerArb), "OVaultComposer::arb");

        deal(arbExecutor, INITIAL_BALANCE);
        deal(arbEndpoint, INITIAL_BALANCE);
    }

    function _createComposePayload(
        uint32 _srcEid,
        SendParam memory _sendParam,
        uint256 _amount,
        address _msgSender
    ) internal pure returns (bytes memory composeMsg) {
        composeMsg = OFTComposeMsgCodec.encode(
            0,
            _srcEid,
            _amount,
            abi.encodePacked(addressToBytes32(_msgSender), abi.encode(_sendParam))
        );
    }

    function _createComposePayload(
        uint32 _srcEid,
        bytes memory _composeMsg,
        uint256 _amount,
        address _msgSender
    ) internal pure returns (bytes memory composeMsg) {
        composeMsg = OFTComposeMsgCodec.encode(
            0,
            _srcEid,
            _amount,
            abi.encodePacked(addressToBytes32(_msgSender), _composeMsg)
        );
    }

    function _setTradeRatioAssetToShare(
        uint256 _assetNum,
        uint256 _shareNum
    ) internal returns (uint256 mintAssets, uint256 mintShares) {
        mintAssets = _assetNum * TOKENS_TO_SEND;
        mintShares = _shareNum * TOKENS_TO_SEND;

        oVault_arb.mint(address(0xbeef), mintShares);
        assetOFT_arb.mint(address(oVault_arb), mintAssets);
    }

    function _randomGUID() internal view returns (bytes32) {
        return bytes32(vm.randomBytes(32));
    }

    function assertEq(uint256 term1, uint256 term2, uint256 term3) internal pure {
        assertEq(term1, term2, "term1 != term2");
        assertEq(term1, term3, "term1 != term3");
    }

    function assertEmpty(SendParam memory _sendParam) internal pure {
        assertEq(_sendParam.dstEid, 0, "dstEid should be empty");
        assertEq(_sendParam.to, bytes32(0), "to should be empty");
        assertEq(_sendParam.amountLD, 0, "amountLD should be empty");
        assertEq(_sendParam.minAmountLD, 0, "minAmountLD should be empty");
        assertEq(_sendParam.extraOptions, bytes(""), "extraOptions should be empty");
    }

    function assertEq(SendParam memory _term1, SendParam memory _term2) internal pure {
        assertEq(_term1.dstEid, _term2.dstEid, "dstEid should be equal");
        assertEq(_term1.to, _term2.to, "to should be equal");
        assertEq(_term1.amountLD, _term2.amountLD, "amountLD should be equal");
        assertEq(_term1.minAmountLD, _term2.minAmountLD, "minAmountLD should be equal");
        assertEq(_term1.extraOptions, _term2.extraOptions, "extraOptions should be equal");
    }
}
