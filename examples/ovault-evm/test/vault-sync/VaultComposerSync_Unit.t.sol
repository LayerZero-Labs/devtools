// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { Errors } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/Errors.sol";

import { VaultComposerSync, IVaultComposerSync } from "@layerzerolabs/ovault-evm/contracts/VaultComposerSync.sol";

import { VaultComposerSyncBaseTest } from "./VaultComposerSync_Base.t.sol";
import { console } from "forge-std/console.sol";

contract VaultComposerSyncUnitTest is VaultComposerSyncBaseTest {
    using OptionsBuilder for bytes;

    function setUp() public virtual override {
        super.setUp();
    }

    function test_deployment() public view {
        assertEq(address(VaultComposerSyncArb.VAULT()), address(vault_arb));
        assertEq(VaultComposerSyncArb.SHARE_OFT(), address(shareOFT_arb));
        assertEq(VaultComposerSyncArb.ASSET_OFT(), address(assetOFT_arb));
    }

    function test_onlyEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlyEndpoint.selector, address(this)));
        VaultComposerSyncArb.lzCompose(address(assetOFT_arb), _randomGUID(), "", userA, "");
    }

    function test_onlyOFT(address _oft) public {
        vm.assume(_oft != address(assetOFT_arb) && _oft != address(shareOFT_arb));

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlyValidComposeCaller.selector, _oft));
        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose{ value: 1 ether }(_oft, _randomGUID(), "", arbExecutor, "");
    }

    function test_lzCompose_pass_dst_not_hub() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(VaultComposerSyncArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 1 ether, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetOFT_arb));
        emit IERC20.Transfer(address(VaultComposerSyncArb), address(vault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(0), address(VaultComposerSyncArb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Deposit(
            address(VaultComposerSyncArb),
            address(VaultComposerSyncArb),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND
        );

        vm.expectEmit(true, true, true, true, address(VaultComposerSyncArb));
        emit IVaultComposerSync.Sent(guid);

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(VaultComposerSyncArb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), vault_arb.balanceOf(address(shareOFT_arb)), TOKENS_TO_SEND);
    }

    function test_lzCompose_pass_dst_is_hub() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(VaultComposerSyncArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(
            VaultComposerSyncArb.VAULT_EID(),
            addressToBytes32(userA),
            TOKENS_TO_SEND,
            0,
            "",
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 0, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetOFT_arb));
        emit IERC20.Transfer(address(VaultComposerSyncArb), address(vault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(0), address(VaultComposerSyncArb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Deposit(
            address(VaultComposerSyncArb),
            address(VaultComposerSyncArb),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND
        );

        vm.expectEmit(true, true, true, true, address(VaultComposerSyncArb));
        emit IVaultComposerSync.Sent(guid);

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(VaultComposerSyncArb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), vault_arb.balanceOf(address(userA)), TOKENS_TO_SEND);
    }

    function test_lzCompose_fail_invalid_payload_auto_refunds() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(VaultComposerSyncArb), TOKENS_TO_SEND);
        uint256 userABalanceEth = assetOFT_eth.balanceOf(userA);

        bytes memory invalidComposeMsg = abi.encode(bytes("0x1234"), 5);
        bytes memory composeMsg = _createComposePayload(ETH_EID, invalidComposeMsg, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(VaultComposerSyncArb));
        emit IVaultComposerSync.Refunded(guid);

        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(
            assetOFT_eth.balanceOf(userA),
            userABalanceEth + TOKENS_TO_SEND,
            "userA should have received refund on Ethereum"
        );
    }

    function test_lzCompose_slippage_causes_refund() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(VaultComposerSyncArb), TOKENS_TO_SEND);
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

        vm.expectEmit(true, true, true, true, address(VaultComposerSyncArb));
        emit IVaultComposerSync.Refunded(guid);

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(VaultComposerSyncArb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        // The operation should be refunded since slippage was too high
        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(
            assetOFT_eth.balanceOf(userA),
            userABalanceEth + TOKENS_TO_SEND,
            "userA should have received refund on Ethereum"
        );
        assertEq(vault_arb.totalSupply(), 0, "No shares should be minted due to refund");
    }

    function test_InsufficientMsgValue_causes_revert_no_refund() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(VaultComposerSyncArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userB), TOKENS_TO_SEND, 0, "", "", "");
        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 10 ether, msgValueToFail, userA);

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.InsufficientMsgValue.selector, 10 ether, 1 ether));

        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");
    }

    function test_lzCompose_fail_not_enough_value_for_refund_complete_revert() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(VaultComposerSyncArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 0, TOKENS_TO_SEND, userA);

        vm.expectRevert(abi.encodeWithSelector(Errors.LZ_InsufficientFee.selector, 200110716, 1, 0, 0)); /// @dev 200110716 is quoteSend value
        vm.prank(arbEndpoint);
        VaultComposerSyncArb.lzCompose{ value: 1 wei }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");
    }
}
