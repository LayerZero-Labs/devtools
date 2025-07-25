// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// OApp imports
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppOptionsType3.sol";

import { VaultComposerSync } from "../../contracts/VaultComposerSync.sol";

import { MockOFT } from "../mocks/MockOFT.sol";
import { MockOFTAdapter } from "../mocks/MockOFT.sol";
import { MockVault } from "../mocks/MockVault.sol";

// Forge imports
import "forge-std/console.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract VaultComposerSyncBaseTest is TestHelperOz5 {
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

    MockVault public vault_arb;
    VaultComposerSync public VaultComposerSyncArb;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    address public arbEndpoint;
    address public arbExecutor = makeAddr("arbExecutor");
    bytes public OPTIONS_LZRECEIVE_100k = OptionsBuilder.newOptions().addExecutorLzReceiveOption(100_000, 0);

    uint256 public constant INITIAL_BALANCE = 100 ether;
    uint256 public constant TOKENS_TO_SEND = 1 ether;

    uint256 public constant msgValueToFail = 100_000 wei;
    uint256 public constant msgValueToPass = 250_000_000 wei;

    function setUp() public virtual override {
        super.setUp();
        setUpEndpoints(subMeshSize, LibraryType.UltraLightNode);

        arbEndpoint = address(endpoints[ARB_EID]);

        /// @dev Deploy the Asset OFT (we can expect them to exist before we deploy the VaultComposerSync)
        assetOFT_arb = new MockOFT("arbAsset", "arbAsset", address(endpoints[ARB_EID]), address(this));
        assetOFT_eth = new MockOFT("ethAsset", "ethAsset", address(endpoints[ETH_EID]), address(this));
        assetOFT_pol = new MockOFT("polAsset", "polAsset", address(endpoints[POL_EID]), address(this));

        // config and wire the ofts
        address[] memory assetOFTs = new address[](subMeshSize);
        assetOFTs[0] = address(assetOFT_eth);
        assetOFTs[1] = address(assetOFT_arb);
        assetOFTs[2] = address(assetOFT_pol);
        this.wireOApps(assetOFTs);

        /// Now the "expansion" is for the arb vault and share ofts on other networks.
        vault_arb = new MockVault("arbShare", "arbShare", address(assetOFT_arb));
        shareOFT_arb = new MockOFTAdapter(address(vault_arb), address(endpoints[ARB_EID]), address(this));
        VaultComposerSyncArb = new VaultComposerSync(
            address(vault_arb),
            address(assetOFT_arb),
            address(shareOFT_arb)
        );

        /// Deploy the Share OFTs on other networks - these are NOT lockbox adapters.
        shareOFT_eth = new MockOFT("ethShare", "ethShare", address(endpoints[ETH_EID]), address(this));
        shareOFT_pol = new MockOFT("polShare", "polShare", address(endpoints[POL_EID]), address(this));

        address[] memory shareOFTs = new address[](subMeshSize);
        shareOFTs[0] = address(shareOFT_eth);
        shareOFTs[1] = address(shareOFT_arb);
        shareOFTs[2] = address(shareOFT_pol);
        this.wireOApps(shareOFTs);

        vm.label(address(assetOFT_arb), "AssetOFT::arb");
        vm.label(address(assetOFT_eth), "AssetOFT::eth");
        vm.label(address(assetOFT_pol), "AssetOFT::pol");

        vm.label(address(shareOFT_arb), "ShareOFTAdapter::arb");
        vm.label(address(shareOFT_eth), "ShareOFT::eth");
        vm.label(address(shareOFT_pol), "ShareOFT::pol");

        vm.label(address(vault_arb), "Vault::arb");
        vm.label(address(VaultComposerSyncArb), "VaultComposerSync::arb");

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

    function _removeDustWithOffset(uint256 _amount, int128 _offset) internal pure returns (uint256, uint256) {
        uint256 amountWithOffset = _amount;
        if (_offset < 0) {
            uint256 modOffset = uint128(-1 * _offset);
            // If offset is negative, we need to ensure we don't underflow
            require(_amount >= modOffset, "Offset too large");
            amountWithOffset = _amount - modOffset;
        } else {
            // If offset is positive, we can safely add it
            amountWithOffset = _amount + uint128(_offset);
        }
        return _removeDust(amountWithOffset);
    }

    function _removeDust(uint256 _amount) internal pure returns (uint256, uint256) {
        uint256 dust = _amount % 10 ** 12;
        return (_amount - dust, dust);
    }

    function _createComposePayload(
        uint32 _srcEid,
        SendParam memory _sendParam,
        uint256 _minMsgValue,
        uint256 _amount,
        address _msgSender
    ) internal pure returns (bytes memory composeMsg) {
        composeMsg = OFTComposeMsgCodec.encode(
            0,
            _srcEid,
            _amount,
            abi.encodePacked(addressToBytes32(_msgSender), abi.encode(_sendParam, _minMsgValue))
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

        vault_arb.mint(address(0xbeef), mintShares);
        assetOFT_arb.mint(address(vault_arb), mintAssets);
    }

    function _createSendParam(uint256 _amount, bool skipMint) internal returns (SendParam memory) {
        if (!skipMint) {
            vault_arb.mint(address(VaultComposerSyncArb), _amount);
        }

        SendParam memory sendParam;
        sendParam.dstEid = POL_EID;
        sendParam.to = addressToBytes32(userB);
        sendParam.amountLD = _amount;
        return sendParam;
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
