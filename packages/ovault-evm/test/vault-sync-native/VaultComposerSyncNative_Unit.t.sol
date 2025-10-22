// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { IVaultComposerSync } from "../../contracts/interfaces/IVaultComposerSync.sol";
import { VaultComposerSyncUnitTest } from "../vault-sync/VaultComposerSync_Unit.t.sol";
import { VaultComposerSyncNativeBaseTest } from "./VaultComposerSyncNative_Base.t.sol";

contract VaultComposerSyncNativeUnitTest is VaultComposerSyncUnitTest, VaultComposerSyncNativeBaseTest {
    function _feedAssets(address _addr, uint256 _amount) internal override {
        /// @dev Send ETH from ASSET_OFT to the composer to simulate real scenario
        /// @dev This is needed because the receive() function only accepts ETH from ASSET_OFT
        vm.deal(address(assetOFT_arb), _amount);
        vm.prank(address(assetOFT_arb));
        (bool success, ) = payable(_addr).call{ value: _amount }("");
        require(success, "ETH transfer failed");
    }

    function _getUndustedAssetAmount(uint256 _amount) internal pure override returns (uint256) {
        return _amount;
    }

    function setUp() public virtual override(VaultComposerSyncUnitTest, VaultComposerSyncNativeBaseTest) {
        super.setUp();
    }

    function test_onlyEndpoint() public override {
        vm.expectRevert(); // Generic revert since native composer may handle differently
        vaultComposer.lzCompose(address(assetOFT_arb), _randomGUID(), "", userA, "");
    }

    function test_lzCompose_pass_dst_not_hub_deposit() public override {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 1 ether, TOKENS_TO_SEND, userA);

        // Before lzCompose: composer should have ETH balance
        assertEq(address(vaultComposer).balance, TOKENS_TO_SEND);
        assertEq(assetToken_arb.balanceOf(address(vaultComposer)), 0, "Composer should not have WETH before lzCompose");

        vm.expectEmit(true, true, true, true, address(assetToken_arb));
        emit IERC20.Transfer(address(vaultComposer), address(vault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(0), address(vaultComposer), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Deposit(address(vaultComposer), address(vaultComposer), TOKENS_TO_SEND, TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Sent(guid);

        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        // After lzCompose: ETH should be wrapped to WETH and deposited
        assertEq(address(vaultComposer).balance, 0, "Composer should have no ETH after lzCompose");
        assertEq(assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), vault_arb.balanceOf(address(shareOFT_arb)), TOKENS_TO_SEND);
    }

    function test_lzCompose_pass_dst_is_hub() public override {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(
            vaultComposer.VAULT_EID(),
            addressToBytes32(userA),
            TOKENS_TO_SEND,
            0,
            "",
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 0, TOKENS_TO_SEND, userA);

        // Before lzCompose: composer should have ETH balance
        assertEq(address(vaultComposer).balance, TOKENS_TO_SEND);
        assertEq(assetToken_arb.balanceOf(address(vaultComposer)), 0, "Composer should not have WETH before lzCompose");

        vm.expectEmit(true, true, true, true, address(assetToken_arb));
        emit IERC20.Transfer(address(vaultComposer), address(vault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(0), address(vaultComposer), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Deposit(address(vaultComposer), address(vaultComposer), TOKENS_TO_SEND, TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Sent(guid);

        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        // After lzCompose: ETH should be wrapped to WETH and deposited
        assertEq(address(vaultComposer).balance, 0, "Composer should have no ETH after lzCompose");
        assertEq(assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), vault_arb.balanceOf(address(userA)), TOKENS_TO_SEND);
    }

    function test_lzCompose_slippage_causes_refund() public override {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);
        uint256 userABalanceEth = assetOFT_eth.balanceOf(userA);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userB),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND + 1, // More than we can provide, causing slippage
            "",
            "",
            ""
        );

        bytes memory composePayload = abi.encode(internalSendParam);
        bytes memory composeMsg = _createComposePayload(ETH_EID, composePayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Refunded(guid);

        // Before lzCompose: composer should have ETH balance
        assertEq(address(vaultComposer).balance, TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        // The operation should be refunded since slippage was too high
        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(
            assetOFT_eth.balanceOf(userA),
            userABalanceEth + TOKENS_TO_SEND,
            "userA should have received refund on Ethereum"
        );
        assertEq(vault_arb.totalSupply(), 0, "No shares should be minted due to refund");
        // After refund, composer should have no ETH since it was sent out as refund
        assertEq(address(vaultComposer).balance, 0, "Composer should have no ETH after refund");
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════
    // GAS LIMIT TESTS - Ensure compatibility with Stargate's 2300 gas transfer limit
    // ═══════════════════════════════════════════════════════════════════════════════════════

    function test_receive_stargate_valid_sender_2300_gas() public {
        // Test valid sender using Stargate's exact transfer pattern
        uint256 ethAmount = 1 ether;

        bool success = _stargatePoolLzReceive(address(assetOFT_arb), address(vaultComposer), ethAmount);

        assertTrue(success, "ETH transfer should succeed");
        // The function should succeed and ETH should be received
        assertEq(address(vaultComposer).balance, ethAmount, "ETH should be received from valid sender");
    }

    function test_receive_stargate_invalid_sender_reverts() public {
        // Test invalid sender using Stargate's transfer pattern
        uint256 ethAmount = 1 ether;
        address invalidSender = makeAddr("invalidSender");

        bool success = _stargatePoolLzReceive(invalidSender, address(vaultComposer), ethAmount);

        assertFalse(success, "ETH transfer should fail");
        assertEq(address(vaultComposer).balance, 0, "No ETH should be received on revert");
    }
}
