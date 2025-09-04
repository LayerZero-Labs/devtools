// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";

// Import Upgradeable contracts
import { OFTUpgradeableTUPMock } from "./mocks/OFTUpgradeableMocks.sol";
import { OFTAltUpgradeableTUPMock } from "./mocks/OFTAltUpgradeableMocks.sol";

// Import shared dependencies
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

// Import proxy contracts for upgrade testing
import { TransparentUpgradeableProxy, ITransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import { ERC1967Utils } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import { Vm } from "forge-std/Vm.sol";

/**
 * @title OFTAltUpgradeable_TUP_MigrationTest
 * @dev Test to verify that migration from OFTUpgradeable to OFTAltUpgradeable preserves all storage
 * including ERC20 balances, ownership, and LayerZero configuration using Transparent Upgradeable Proxy (TUP) pattern
 */
contract OFTAltUpgradeable_TUP_MigrationTest is TestHelperOz5 {
    // Struct to pack state variables and avoid stack too deep
    struct PreMigrationState {
        uint256 ownerBalance;
        uint256 userABalance;
        uint256 userBBalance;
        uint256 userCBalance;
        uint256 totalSupply;
        bytes32 peer1;
        bytes32 peer2;
        address owner;
        string name;
        string symbol;
    }

    // Test contracts
    OFTUpgradeableTUPMock regularOFTImpl;
    OFTAltUpgradeableTUPMock altOFTImpl;
    TransparentUpgradeableProxy proxy;
    ProxyAdmin proxyAdmin;

    // Proxy interfaces
    OFTUpgradeableTUPMock regularOFT;
    OFTAltUpgradeableTUPMock altOFT;

    // Test constants
    address constant OWNER = address(0x1111111111111111111111111111111111111111);
    address constant USER_A = address(0x2222222222222222222222222222222222222222);
    address constant USER_B = address(0x3333333333333333333333333333333333333333);
    address constant USER_C = address(0x4444444444444444444444444444444444444444);

    // keccak256(abi.encode(uint256(keccak256("layerzerov2.storage.oappcore")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OAPP_CORE_STORAGE_SLOT =
        0x72ab1bc1039b79dc4724ffca13de82c96834302d3c7e0d4252232d4b2dd8f900;

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 constant USER_A_BALANCE = 100_000 ether;
    uint256 constant USER_B_BALANCE = 50_000 ether;
    uint256 constant USER_C_BALANCE = 25_000 ether;

    uint32 constant TEST_EID_1 = 101;
    uint32 constant TEST_EID_2 = 102;
    uint32 constant TEST_EID_3 = 103;

    string constant TOKEN_NAME = "TestOFT";
    string constant TOKEN_SYMBOL = "TOFT";

    // Test peer data
    bytes32 testPeer1;
    bytes32 testPeer2;
    bytes32 testPeer3;

    function setUp() public override {
        super.setUp();
        _deployImplementations();
        _generateTestData();
        _deployProxyWithRegularOFT();
        _setupInitialState();
    }

    /// @dev Deploy implementation contracts with proper endpoints
    function _deployImplementations() internal {
        address[] memory nativeTokens = new address[](2);
        nativeTokens[0] = address(0); // Regular endpoint with no native token
        nativeTokens[1] = address(0x5555555555555555555555555555555555555555); // Alt endpoint with native token

        createEndpoints(2, LibraryType.UltraLightNode, nativeTokens);

        regularOFTImpl = new OFTUpgradeableTUPMock(address(endpoints[1]));
        altOFTImpl = new OFTAltUpgradeableTUPMock(address(endpoints[2]));
    }

    /// @dev Generate test peer data
    function _generateTestData() internal {
        testPeer1 = bytes32(uint256(0xaaaaaa));
        testPeer2 = bytes32(uint256(0xbbbbbb));
        testPeer3 = bytes32(uint256(0xcccccc));
    }

    /// @dev Deploy TUP proxy with regular OFT implementation
    function _deployProxyWithRegularOFT() internal {
        regularOFT = OFTUpgradeableTUPMock(
            _deployContractAndProxy(
                type(OFTUpgradeableTUPMock).creationCode,
                abi.encode(address(endpoints[1])),
                abi.encodeWithSelector(OFTUpgradeableTUPMock.initialize.selector, TOKEN_NAME, TOKEN_SYMBOL, OWNER)
            )
        );

        proxyAdmin = ProxyAdmin(getProxyAdminAddress(address(regularOFT)));
    }

    /// @dev Setup common initial state used by most tests
    function _setupInitialState() internal {
        vm.startPrank(OWNER);
        regularOFT.mint(OWNER, INITIAL_SUPPLY - USER_A_BALANCE - USER_B_BALANCE - USER_C_BALANCE);
        regularOFT.mint(USER_A, USER_A_BALANCE);
        regularOFT.mint(USER_B, USER_B_BALANCE);
        regularOFT.mint(USER_C, USER_C_BALANCE);

        regularOFT.setPeer(TEST_EID_1, testPeer1);
        regularOFT.setPeer(TEST_EID_2, testPeer2);
        vm.stopPrank();
    }

    /**
     * @dev Helper function to perform TUP migration
     */
    function _performMigration() internal {
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(regularOFT)), address(altOFTImpl), "");
        altOFT = OFTAltUpgradeableTUPMock(address(regularOFT));
    }

    /// @dev Set LayerZero peers configuration
    function _setLayerZeroPeers(uint32[] memory eids, bytes32[] memory peers) internal {
        require(eids.length == peers.length, "Arrays length mismatch");

        vm.startPrank(OWNER);
        for (uint i = 0; i < eids.length; i++) {
            regularOFT.setPeer(eids[i], peers[i]);
        }
        vm.stopPrank();
    }

    /// @dev Capture comprehensive state before migration
    function _capturePreMigrationState(
        uint32 eid1,
        uint32 eid2
    ) internal view returns (PreMigrationState memory state) {
        state.ownerBalance = regularOFT.balanceOf(OWNER);
        state.userABalance = regularOFT.balanceOf(USER_A);
        state.userBBalance = regularOFT.balanceOf(USER_B);
        state.userCBalance = regularOFT.balanceOf(USER_C);
        state.totalSupply = regularOFT.totalSupply();
        state.peer1 = regularOFT.peers(eid1);
        state.peer2 = regularOFT.peers(eid2);
        state.owner = regularOFT.owner();
        state.name = regularOFT.name();
        state.symbol = regularOFT.symbol();
    }

    /// @dev Assert all state is preserved after migration
    function _assertStatePreserved(PreMigrationState memory state) internal view {
        assertEq(altOFT.balanceOf(OWNER), state.ownerBalance, "Owner balance should be preserved");
        assertEq(altOFT.balanceOf(USER_A), state.userABalance, "User A balance should be preserved");
        assertEq(altOFT.balanceOf(USER_B), state.userBBalance, "User B balance should be preserved");
        assertEq(altOFT.balanceOf(USER_C), state.userCBalance, "User C balance should be preserved");
        assertEq(altOFT.totalSupply(), state.totalSupply, "Total supply should be preserved");
        assertEq(altOFT.owner(), state.owner, "Owner should be preserved");
        assertEq(altOFT.name(), state.name, "Name should be preserved");
        assertEq(altOFT.symbol(), state.symbol, "Symbol should be preserved");
    }

    /// @dev Assert alt-specific functionality works after migration
    function _assertAltFunctionality() internal view {
        address nativeToken = address(altOFT.nativeToken());
        assertTrue(nativeToken != address(0), "Native token should be set in alt implementation");
    }

    function getProxyAdminAddress(address proxyAddress) internal view returns (address) {
        bytes32 adminSlot = vm.load(proxyAddress, ERC1967Utils.ADMIN_SLOT); // ERC1967 proxy admin storage slot
        return address(uint160(uint256(adminSlot)));
    }

    function _deployContractAndProxy(
        bytes memory _oappBytecode,
        bytes memory _constructorArgs,
        bytes memory _initializeArgs
    ) internal returns (address addr) {
        bytes memory bytecode = bytes.concat(abi.encodePacked(_oappBytecode), _constructorArgs);
        assembly {
            addr := create(0, add(bytecode, 0x20), mload(bytecode))
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        return address(new TransparentUpgradeableProxy(addr, address(this), _initializeArgs));
    }

    function test_completeMigrationFlowTUP() public {
        // Verify initial state
        assertEq(regularOFT.name(), TOKEN_NAME, "Name should be set");
        assertEq(regularOFT.symbol(), TOKEN_SYMBOL, "Symbol should be set");
        assertEq(regularOFT.owner(), OWNER, "Owner should be set");
        assertEq(regularOFT.totalSupply(), INITIAL_SUPPLY, "Total supply should match");

        // Capture state before migration
        PreMigrationState memory state = _capturePreMigrationState(TEST_EID_1, TEST_EID_2);

        _performMigration();

        // Verify all state is preserved after migration
        _assertStatePreserved(state);
        assertEq(altOFT.peers(TEST_EID_1), state.peer1, "Peer 1 should be preserved");
        assertEq(altOFT.peers(TEST_EID_2), state.peer2, "Peer 2 should be preserved");

        _assertAltFunctionality();
    }

    function test_storageSlotEquivalencyAfterTUPMigration() public {
        // Read storage slots before migration
        // Calculate storage slots for verification
        bytes32 userABalanceSlot = keccak256(abi.encode(USER_A, 0)); // ERC20 balance mapping slot for USER_A
        bytes32 userBBalanceSlot = keccak256(abi.encode(USER_B, 0)); // ERC20 balance mapping slot for USER_B
        bytes32 totalSupplySlot = bytes32(uint256(2)); // ERC20 total supply storage slot
        bytes32 peer1Slot = keccak256(
            abi.encode(TEST_EID_1, OAPP_CORE_STORAGE_SLOT) // LayerZero peer mapping slot for EID 1
        );
        bytes32 peer2Slot = keccak256(
            abi.encode(TEST_EID_2, OAPP_CORE_STORAGE_SLOT) // LayerZero peer mapping slot for EID 2
        );

        bytes32 userABalanceBefore = vm.load(address(regularOFT), userABalanceSlot);
        bytes32 userBBalanceBefore = vm.load(address(regularOFT), userBBalanceSlot);
        bytes32 totalSupplyBefore = vm.load(address(regularOFT), totalSupplySlot);
        bytes32 peer1Before = vm.load(address(regularOFT), peer1Slot);
        bytes32 peer2Before = vm.load(address(regularOFT), peer2Slot);

        // Perform migration
        _performMigration();

        // Verify storage slots are identical after migration
        bytes32 userABalanceAfter = vm.load(address(regularOFT), userABalanceSlot);
        bytes32 userBBalanceAfter = vm.load(address(regularOFT), userBBalanceSlot);
        bytes32 totalSupplyAfter = vm.load(address(regularOFT), totalSupplySlot);
        bytes32 peer1After = vm.load(address(regularOFT), peer1Slot);
        bytes32 peer2After = vm.load(address(regularOFT), peer2Slot);

        assertEq(userABalanceBefore, userABalanceAfter, "User A balance slot should be identical");
        assertEq(userBBalanceBefore, userBBalanceAfter, "User B balance slot should be identical");
        assertEq(totalSupplyBefore, totalSupplyAfter, "Total supply slot should be identical");
        assertEq(peer1Before, peer1After, "Peer 1 slot should be identical");
        assertEq(peer2Before, peer2After, "Peer 2 slot should be identical");
    }

    function test_erc20BalancePreservationWithTransfersTUP() public {
        // Perform some transfers to create complex state
        vm.prank(USER_A);
        regularOFT.transfer(USER_B, 25_000 ether);

        vm.prank(USER_B);
        regularOFT.transfer(USER_C, 10_000 ether);

        vm.prank(USER_C);
        regularOFT.transfer(OWNER, 5_000 ether);

        // Set allowances
        vm.prank(USER_B);
        regularOFT.approve(USER_C, 15_000 ether);

        // Capture complex state
        uint256 ownerBalance = regularOFT.balanceOf(OWNER);
        uint256 userABalance = regularOFT.balanceOf(USER_A);
        uint256 userBBalance = regularOFT.balanceOf(USER_B);
        uint256 userCBalance = regularOFT.balanceOf(USER_C);
        uint256 totalSupply = regularOFT.totalSupply();
        uint256 allowanceBtoC = regularOFT.allowance(USER_B, USER_C);

        // Perform migration
        _performMigration();

        // Verify all balances and allowances are preserved
        assertEq(altOFT.balanceOf(OWNER), ownerBalance, "Owner balance preserved");
        assertEq(altOFT.balanceOf(USER_A), userABalance, "User A balance preserved");
        assertEq(altOFT.balanceOf(USER_B), userBBalance, "User B balance preserved");
        assertEq(altOFT.balanceOf(USER_C), userCBalance, "User C balance preserved");
        assertEq(altOFT.totalSupply(), totalSupply, "Total supply preserved");
        assertEq(altOFT.allowance(USER_B, USER_C), allowanceBtoC, "Allowance preserved");

        // Test post-migration functionality
        vm.prank(USER_C);
        altOFT.transferFrom(USER_B, USER_A, 5_000 ether);

        assertEq(altOFT.balanceOf(USER_A), userABalance + 5_000 ether, "Transfer should work after migration");
        assertEq(altOFT.balanceOf(USER_B), userBBalance - 5_000 ether, "Transfer should work after migration");
        assertEq(altOFT.allowance(USER_B, USER_C), allowanceBtoC - 5_000 ether, "Allowance should be reduced");
    }

    function test_layerZeroConfigurationPreservationTUP() public {
        // Set additional LayerZero configuration (basic config already set in setUp)
        vm.prank(OWNER);
        regularOFT.setPeer(TEST_EID_3, testPeer3);

        // Capture LayerZero state
        bytes32 peer1 = regularOFT.peers(TEST_EID_1);
        bytes32 peer2 = regularOFT.peers(TEST_EID_2);
        bytes32 peer3 = regularOFT.peers(TEST_EID_3);

        // Perform migration
        _performMigration();

        // Verify LayerZero configuration is preserved
        assertEq(altOFT.peers(TEST_EID_1), peer1, "Peer 1 should be preserved");
        assertEq(altOFT.peers(TEST_EID_2), peer2, "Peer 2 should be preserved");
        assertEq(altOFT.peers(TEST_EID_3), peer3, "Peer 3 should be preserved");

        // Test that new configuration still works
        vm.prank(OWNER);
        altOFT.setPeer(104, bytes32(uint256(0x4444)));

        assertEq(altOFT.peers(104), bytes32(uint256(0x4444)), "New peer configuration should work");
    }

    function test_TUPAdminFunctionality() public {
        // Test that only proxy admin can upgrade - this should fail when called by a non-admin
        vm.expectRevert();
        vm.prank(OWNER);
        proxyAdmin.upgradeAndCall(ITransparentUpgradeableProxy(address(regularOFT)), address(altOFTImpl), "");

        // Test successful upgrade by proxy admin (this contract is the admin)
        _performMigration();

        // Verify implementation changed by testing alt functionality
        address nativeToken = address(altOFT.nativeToken());
        assertTrue(nativeToken != address(0), "Implementation should be updated to Alt version");
    }
}
