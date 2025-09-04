// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";

import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { OFTUpgradeableBaseMock } from "./mocks/OFTUpgradeableMocks.sol";
import { OFTAltUpgradeableBaseMock } from "./mocks/OFTAltUpgradeableMocks.sol";

import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { console } from "forge-std/Test.sol";

contract OFTAltUpgradeable_StorageEquivalencyTest is TestHelperOz5 {
    using OFTMsgCodec for address;

    OFTUpgradeableBaseMock regularOFT;
    OFTAltUpgradeableBaseMock altOFT;

    address constant DELEGATE = address(0x1111111111111111111111111111111111111111);

    // keccak256(abi.encode(uint256(keccak256("layerzerov2.storage.oappcore")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OAPP_CORE_STORAGE_SLOT =
        0x72ab1bc1039b79dc4724ffca13de82c96834302d3c7e0d4252232d4b2dd8f900;

    // Test constants
    string constant TOKEN_NAME = "TestOFT";
    string constant TOKEN_SYMBOL = "TOFT";
    uint8 constant TOKEN_DECIMALS = 18;

    function setUp() public override {
        super.setUp();
        _deployTestContracts();
        _initializeContracts();
    }

    /// @dev Deploy both regular and alt OFT contracts with appropriate endpoints
    function _deployTestContracts() internal {
        // Create endpoints with native tokens for alt functionality
        address[] memory nativeTokens = new address[](2);
        nativeTokens[0] = address(0); // Regular endpoint with no native token
        nativeTokens[1] = vm.randomAddress(); // Alt endpoint with native token

        createEndpoints(2, LibraryType.UltraLightNode, nativeTokens);

        regularOFT = new OFTUpgradeableBaseMock(address(endpoints[1]));
        altOFT = new OFTAltUpgradeableBaseMock(address(endpoints[2]));
    }

    /// @dev Initialize both contracts with identical parameters
    function _initializeContracts() internal {
        regularOFT.initialize(TOKEN_NAME, TOKEN_SYMBOL, DELEGATE);
        altOFT.initialize(TOKEN_NAME, TOKEN_SYMBOL, DELEGATE);
    }

    /// @dev Helper to set peers on both contracts
    function _setPeersOnBoth(uint32 eid, bytes32 peer) internal {
        vm.startPrank(DELEGATE);
        regularOFT.setPeer(eid, peer);
        altOFT.setPeer(eid, peer);
        vm.stopPrank();
    }

    /// @dev Assert that storage values match between regular and alt contracts
    function _assertStorageEquivalency(bytes32 slot, string memory description) internal view {
        bytes32 regularValue = vm.load(address(regularOFT), slot);
        bytes32 altValue = vm.load(address(altOFT), slot);
        assertEq(regularValue, altValue, string.concat(description, " should be identical"));
    }

    /// @dev Assert ERC20 metadata equivalency
    function _assertERC20Metadata() internal view {
        assertEq(regularOFT.name(), TOKEN_NAME, "Regular OFT name should match expected");
        assertEq(altOFT.name(), TOKEN_NAME, "Alt OFT name should match expected");
        assertEq(regularOFT.name(), altOFT.name(), "Names should be identical");

        assertEq(regularOFT.symbol(), TOKEN_SYMBOL, "Regular OFT symbol should match expected");
        assertEq(altOFT.symbol(), TOKEN_SYMBOL, "Alt OFT symbol should match expected");
        assertEq(regularOFT.symbol(), altOFT.symbol(), "Symbols should be identical");

        assertEq(regularOFT.decimals(), TOKEN_DECIMALS, "Regular OFT should have expected decimals");
        assertEq(altOFT.decimals(), TOKEN_DECIMALS, "Alt OFT should have expected decimals");
        assertEq(regularOFT.decimals(), altOFT.decimals(), "Decimals should be identical");
    }

    function test_immutableVariables() public view {
        assertEq(address(regularOFT.endpoint()), endpoints[1], "Regular OFT endpoint should match");
        assertEq(address(altOFT.endpoint()), endpoints[2], "Alt OFT endpoint should match");

        address altNativeToken = address(altOFT.nativeToken());
        assertTrue(altNativeToken != address(0), "Alt OFT nativeToken should be set");
    }

    function test_oappCoreStorageEquivalency() public {
        uint32 testEid = 101;
        bytes32 testPeer = vm.randomAddress().addressToBytes32();

        _setPeersOnBoth(testEid, testPeer);

        bytes32 peerStorageSlot = keccak256(abi.encode(testEid, OAPP_CORE_STORAGE_SLOT));
        bytes32 regularPeerValue = vm.load(address(regularOFT), peerStorageSlot);
        bytes32 altPeerValue = vm.load(address(altOFT), peerStorageSlot);

        assertEq(regularPeerValue, altPeerValue, "Peer storage values should be identical");
        assertEq(regularPeerValue, testPeer, "Peer should match expected value");

        assertEq(regularOFT.peers(testEid), testPeer, "Regular OFT peer should match");
        assertEq(altOFT.peers(testEid), testPeer, "Alt OFT peer should match");
    }

    function test_erc20StorageEquivalency() public view {
        _assertERC20Metadata();
    }

    function test_directStorageSlotComparison() public view {
        _assertStorageEquivalency(bytes32(uint256(0)), "Name storage slots");
        _assertStorageEquivalency(bytes32(uint256(1)), "Symbol storage slots");
        _assertStorageEquivalency(bytes32(uint256(2)), "Total supply storage slots");
    }
}
