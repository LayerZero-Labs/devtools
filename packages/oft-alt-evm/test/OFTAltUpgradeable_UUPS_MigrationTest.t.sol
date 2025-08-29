// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";

// Import Upgradeable contracts
import { OFTUpgradeableUUPSMock } from "./mocks/OFTUpgradeableMocks.sol";
import { OFTAltUpgradeableUUPSMock } from "./mocks/OFTAltUpgradeableMocks.sol";

// Import shared dependencies
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

// Import proxy contracts for upgrade testing
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title OFTAltUpgradeable_UUPS_MigrationTest
 * @dev Test to verify that migration from OFTUpgradeable to OFTAltUpgradeable preserves all storage
 * including ERC20 balances, ownership, and LayerZero configuration using UUPS proxy pattern
 */
contract OFTAltUpgradeable_UUPS_MigrationTest is TestHelperOz5 {
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
    OFTUpgradeableUUPSMock regularOFTImpl;
    OFTAltUpgradeableUUPSMock altOFTImpl;
    ERC1967Proxy proxy;

    // Proxy interfaces
    OFTUpgradeableUUPSMock regularOFT;
    OFTAltUpgradeableUUPSMock altOFT;

    // Test constants
    address constant OWNER = address(0x1111111111111111111111111111111111111111);
    address constant USER_A = address(0x2222222222222222222222222222222222222222);
    address constant USER_B = address(0x3333333333333333333333333333333333333333);
    address constant USER_C = address(0x4444444444444444444444444444444444444444);

    bytes32 constant OAPP_CORE_STORAGE_SLOT = 0x72ab1bc1039b79dc4724ffca13de82c96834302d3c7e0d4252232d4b2dd8f900; // ERC-7201 namespaced storage slot for LayerZero OAppCore

    uint256 constant INITIAL_SUPPLY = 1000000e18;
    uint256 constant USER_A_BALANCE = 100000e18;
    uint256 constant USER_B_BALANCE = 50000e18;
    uint256 constant USER_C_BALANCE = 25000e18;

    string constant TOKEN_NAME = "TestToken";
    string constant TOKEN_SYMBOL = "TEST";

    function setUp() public override {
        super.setUp();
        _deployImplementations();
    }

    /// @dev Deploy implementation contracts with proper endpoints
    function _deployImplementations() internal {
        address[] memory nativeTokens = new address[](2);
        nativeTokens[0] = address(0); // Regular endpoint with no native token
        nativeTokens[1] = address(0x5555555555555555555555555555555555555555); // Alt endpoint with native token

        createEndpoints(2, LibraryType.UltraLightNode, nativeTokens);

        regularOFTImpl = new OFTUpgradeableUUPSMock(address(endpoints[1]));
        altOFTImpl = new OFTAltUpgradeableUUPSMock(address(endpoints[2]));
    }

    /// @dev Deploy and initialize proxy with regular OFT implementation
    function _deployProxyWithRegularOFT(string memory name, string memory symbol) internal {
        bytes memory initData = abi.encodeWithSelector(OFTUpgradeableUUPSMock.initialize.selector, name, symbol, OWNER);

        proxy = new ERC1967Proxy(address(regularOFTImpl), initData);
        regularOFT = OFTUpgradeableUUPSMock(address(proxy));
    }

    /// @dev Mint tokens to multiple users for testing
    function _mintTokensToUsers() internal {
        vm.startPrank(OWNER);
        regularOFT.mint(OWNER, INITIAL_SUPPLY - USER_A_BALANCE - USER_B_BALANCE - USER_C_BALANCE);
        regularOFT.mint(USER_A, USER_A_BALANCE);
        regularOFT.mint(USER_B, USER_B_BALANCE);
        regularOFT.mint(USER_C, USER_C_BALANCE);
        vm.stopPrank();
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

    /// @dev Perform UUPS upgrade to alt implementation
    function _performUpgradeToAlt() internal {
        vm.prank(OWNER);
        regularOFT.upgradeToAndCall(address(altOFTImpl), "");
        altOFT = OFTAltUpgradeableUUPSMock(address(proxy));
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

    /// @dev Assert storage slots are identical before and after migration
    function _assertStorageSlotEquivalency(bytes32 slot, bytes32 beforeValue, string memory description) internal view {
        bytes32 afterValue = vm.load(address(proxy), slot);
        assertEq(beforeValue, afterValue, string.concat(description, " storage should be identical"));
    }

    /// @dev Assert alt-specific functionality works after migration
    function _assertAltFunctionality() internal view {
        address nativeToken = address(altOFT.nativeToken());
        assertTrue(nativeToken != address(0), "Native token should be set in alt implementation");
    }

    /**
     * @dev Test complete migration flow from OFTUpgradeable to OFTAltUpgradeable
     */
    function test_completeMigrationFlow() public {
        _deployProxyWithRegularOFT(TOKEN_NAME, TOKEN_SYMBOL);

        // Verify initial state
        assertEq(regularOFT.name(), TOKEN_NAME, "Name should be set");
        assertEq(regularOFT.symbol(), TOKEN_SYMBOL, "Symbol should be set");
        assertEq(regularOFT.owner(), OWNER, "Owner should be set");
        assertEq(regularOFT.totalSupply(), 0, "Initial supply should be 0");

        _mintTokensToUsers();

        // Set LayerZero configuration
        uint32[] memory eids = new uint32[](2);
        bytes32[] memory peers = new bytes32[](2);
        eids[0] = 101;
        eids[1] = 102;
        peers[0] = bytes32(uint256(0xaaaaaa));
        peers[1] = bytes32(uint256(0xbbbbbb));

        _setLayerZeroPeers(eids, peers);

        // Capture state before migration
        PreMigrationState memory state = _capturePreMigrationState(eids[0], eids[1]);

        _performUpgradeToAlt();

        // Verify all state is preserved after migration
        _assertStatePreserved(state);
        assertEq(altOFT.peers(eids[0]), state.peer1, "Peer 1 should be preserved");
        assertEq(altOFT.peers(eids[1]), state.peer2, "Peer 2 should be preserved");

        _assertAltFunctionality();
    }

    /**
     * @dev Test storage slot equivalency after migration
     */
    function test_storageSlotEquivalencyAfterMigration() public {
        _deployProxyWithRegularOFT("MigrationTest", "MIG");

        // Fund multiple users and set peers
        vm.startPrank(OWNER);
        regularOFT.mint(USER_A, USER_A_BALANCE);
        regularOFT.mint(USER_B, USER_B_BALANCE);
        vm.stopPrank();

        uint32[] memory eids = new uint32[](2);
        bytes32[] memory peers = new bytes32[](2);
        eids[0] = 101;
        eids[1] = 102;
        peers[0] = bytes32(uint256(0xcafe));
        peers[1] = bytes32(uint256(0xbabe));

        _setLayerZeroPeers(eids, peers);

        // Capture storage before migration - calculate specific storage slots for verification
        bytes32 userABalanceSlot = keccak256(abi.encode(USER_A, 0)); // ERC20 balance mapping slot for USER_A
        bytes32 userBBalanceSlot = keccak256(abi.encode(USER_B, 0)); // ERC20 balance mapping slot for USER_B
        bytes32 totalSupplySlot = bytes32(uint256(2)); // ERC20 total supply storage slot
        bytes32 peer101Slot = keccak256(abi.encode(101, OAPP_CORE_STORAGE_SLOT)); // LayerZero peer mapping slot for EID 101
        bytes32 peer102Slot = keccak256(abi.encode(102, OAPP_CORE_STORAGE_SLOT)); // LayerZero peer mapping slot for EID 102

        bytes32 userABalanceBefore = vm.load(address(proxy), userABalanceSlot);
        bytes32 userBBalanceBefore = vm.load(address(proxy), userBBalanceSlot);
        bytes32 totalSupplyBefore = vm.load(address(proxy), totalSupplySlot);
        bytes32 peer101Before = vm.load(address(proxy), peer101Slot);
        bytes32 peer102Before = vm.load(address(proxy), peer102Slot);

        _performUpgradeToAlt();

        // Verify storage slots are identical after migration
        _assertStorageSlotEquivalency(userABalanceSlot, userABalanceBefore, "User A balance");
        _assertStorageSlotEquivalency(userBBalanceSlot, userBBalanceBefore, "User B balance");
        _assertStorageSlotEquivalency(totalSupplySlot, totalSupplyBefore, "Total supply");
        _assertStorageSlotEquivalency(peer101Slot, peer101Before, "Peer 101");
        _assertStorageSlotEquivalency(peer102Slot, peer102Before, "Peer 102");

        // Verify through contract interface as well
        assertEq(altOFT.balanceOf(USER_A), USER_A_BALANCE, "User A balance should match");
        assertEq(altOFT.balanceOf(USER_B), USER_B_BALANCE, "User B balance should match");
        assertEq(altOFT.peers(101), bytes32(uint256(0xcafe)), "Peer 101 should match");
        assertEq(altOFT.peers(102), bytes32(uint256(0xbabe)), "Peer 102 should match");
    }

    /**
     * @dev Test ERC20 balance preservation during migration with transfers
     */
    function test_erc20BalancePreservationWithTransfers() public {
        _deployProxyWithRegularOFT("TransferTest", "XFER");

        // Mint tokens to owner
        vm.prank(OWNER);
        regularOFT.mint(OWNER, INITIAL_SUPPLY);

        // Perform various transfers to create complex balance state
        vm.startPrank(OWNER);
        regularOFT.transfer(USER_A, USER_A_BALANCE);
        regularOFT.transfer(USER_B, USER_B_BALANCE);
        vm.stopPrank();

        // User A transfers some to User C
        vm.prank(USER_A);
        regularOFT.transfer(USER_C, USER_C_BALANCE);

        // User B approves and User C transfers from User B
        uint256 approvalAmount = 10000e18;
        vm.prank(USER_B);
        regularOFT.approve(USER_C, approvalAmount);

        vm.prank(USER_C);
        regularOFT.transferFrom(USER_B, USER_C, approvalAmount);

        // Capture complex state before migration
        uint256 ownerBalanceBefore = regularOFT.balanceOf(OWNER);
        uint256 userABalanceBefore = regularOFT.balanceOf(USER_A);
        uint256 userBBalanceBefore = regularOFT.balanceOf(USER_B);
        uint256 userCBalanceBefore = regularOFT.balanceOf(USER_C);
        uint256 totalSupplyBefore = regularOFT.totalSupply();
        uint256 allowanceBefore = regularOFT.allowance(USER_B, USER_C);

        _performUpgradeToAlt();

        // Verify all balances and allowances are preserved
        assertEq(altOFT.balanceOf(OWNER), ownerBalanceBefore, "Owner balance should be preserved");
        assertEq(altOFT.balanceOf(USER_A), userABalanceBefore, "User A balance should be preserved");
        assertEq(altOFT.balanceOf(USER_B), userBBalanceBefore, "User B balance should be preserved");
        assertEq(altOFT.balanceOf(USER_C), userCBalanceBefore, "User C balance should be preserved");
        assertEq(altOFT.totalSupply(), totalSupplyBefore, "Total supply should be preserved");
        assertEq(altOFT.allowance(USER_B, USER_C), allowanceBefore, "Allowance should be preserved");

        // Test that ERC20 functionality still works after migration
        uint256 transferAmount = 1000e18;
        vm.prank(USER_A);
        altOFT.transfer(USER_B, transferAmount);

        assertEq(altOFT.balanceOf(USER_A), userABalanceBefore - transferAmount, "Transfer should work post-migration");
        assertEq(altOFT.balanceOf(USER_B), userBBalanceBefore + transferAmount, "Transfer should work post-migration");
    }

    /**
     * @dev Test LayerZero configuration preservation during migration
     */
    function test_layerZeroConfigurationPreservation() public {
        _deployProxyWithRegularOFT("LayerZeroTest", "LZ");

        // Set up complex LayerZero configuration
        uint32[] memory eids = new uint32[](5);
        bytes32[] memory peers = new bytes32[](5);

        eids[0] = 101;
        peers[0] = bytes32(uint256(0x1111));
        eids[1] = 102;
        peers[1] = bytes32(uint256(0x2222));
        eids[2] = 103;
        peers[2] = bytes32(uint256(0x3333));
        eids[3] = 104;
        peers[3] = bytes32(uint256(0x4444));
        eids[4] = 105;
        peers[4] = bytes32(uint256(0x5555));

        _setLayerZeroPeers(eids, peers);

        // Verify configuration before migration
        for (uint i = 0; i < eids.length; i++) {
            assertEq(regularOFT.peers(eids[i]), peers[i], "Peer should be set correctly");
        }

        _performUpgradeToAlt();

        // Verify all LayerZero configuration is preserved
        for (uint i = 0; i < eids.length; i++) {
            assertEq(altOFT.peers(eids[i]), peers[i], "Peer should be preserved after migration");
        }

        // Test that LayerZero functionality still works after migration
        vm.prank(OWNER);
        altOFT.setPeer(106, bytes32(uint256(0x6666)));

        assertEq(altOFT.peers(106), bytes32(uint256(0x6666)), "New peer setting should work post-migration");
    }

    /**
     * @dev Test migration failure scenarios and rollback
     */
    function test_migrationFailureScenarios() public {
        _deployProxyWithRegularOFT("FailureTest", "FAIL");

        // Set initial state
        vm.prank(OWNER);
        regularOFT.mint(USER_A, USER_A_BALANCE);

        uint256 balanceBefore = regularOFT.balanceOf(USER_A);

        // Test that non-owner cannot upgrade
        vm.prank(USER_A);
        vm.expectRevert(); // Should revert because USER_A is not owner
        regularOFT.upgradeToAndCall(address(altOFTImpl), "");

        // Verify state is unchanged after failed upgrade attempt
        assertEq(regularOFT.balanceOf(USER_A), balanceBefore, "Balance should be unchanged after failed upgrade");

        _performUpgradeToAlt();
        assertEq(altOFT.balanceOf(USER_A), balanceBefore, "Balance should be preserved after successful upgrade");
    }
}
