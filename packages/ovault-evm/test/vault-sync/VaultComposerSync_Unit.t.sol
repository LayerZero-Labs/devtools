// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { Errors } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/Errors.sol";

import { IVaultComposerSync } from "../../contracts/interfaces/IVaultComposerSync.sol";
import { VaultComposerSyncBaseTest } from "./VaultComposerSync_Base.t.sol";

contract VaultComposerSyncUnitTest is VaultComposerSyncBaseTest {
    using OptionsBuilder for bytes;

    function _feedAssets(address _addr, uint256 _amount) internal virtual {
        assetToken_arb.mint(_addr, _amount);
    }

    function _getUndustedAssetAmount(uint256 _amount) internal pure virtual returns (uint256) {
        (uint256 sentUndusted,) = _removeDust(_amount);
        return sentUndusted;
    }

    function setUp() public virtual override {
        super.setUp();
    }

    function test_deployment() public view {
        assertEq(address(vaultComposer.VAULT()), address(vault_arb));
        assertEq(vaultComposer.SHARE_OFT(), address(shareOFT_arb));
        assertEq(vaultComposer.ASSET_OFT(), address(assetOFT_arb));
    }

    function test_onlyEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlyEndpoint.selector, address(this)));
        vaultComposer.lzCompose(address(assetOFT_arb), _randomGUID(), "", userA, "");
    }

    function test_onlyOFT(address _oft) public {
        vm.assume(_oft != address(assetOFT_arb) && _oft != address(shareOFT_arb));

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.OnlyValidComposeCaller.selector, _oft));
        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(_oft, _randomGUID(), "", arbExecutor, "");
    }

    function test_lzCompose_pass_dst_not_hub_deposit() public {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 1 ether, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetToken_arb));
        emit IERC20.Transfer(address(vaultComposer), address(vault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(0), address(vaultComposer), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Deposit(
            address(vaultComposer),
            address(vaultComposer),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND
        );

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Sent(guid);

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vaultComposer)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), vault_arb.balanceOf(address(shareOFT_arb)), TOKENS_TO_SEND);
    }

    function test_lzCompose_pass_dst_not_hub_withdraw() public {
        bytes32 guid = _randomGUID();
        vault_arb.mint(address(vaultComposer), TOKENS_TO_SEND);

        _setTradeRatioAssetToShare(TOKENS_TO_SEND, TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 1 ether, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(vaultComposer), address(0), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(assetToken_arb));
        emit IERC20.Transfer(address(vault_arb), address(vaultComposer), TOKENS_TO_SEND - 1);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Withdraw(
            address(vaultComposer),
            address(vaultComposer),
            address(vaultComposer),
            TOKENS_TO_SEND - 1, /// @dev Due to ERC4626 rounding.
            TOKENS_TO_SEND
        ); 

        vm.expectEmit(true, true, true, true, address(assetToken_arb));
        emit IERC20.Transfer(address(vaultComposer), address(0), _getUndustedAssetAmount(TOKENS_TO_SEND - 1));
 
        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Sent(guid);

        assertEq(vault_arb.balanceOf(address(vaultComposer)), TOKENS_TO_SEND);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(shareOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(vault_arb.balanceOf(address(vaultComposer)), 0);
    }

    function test_lzCompose_pass_dst_is_hub() public {
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

        vm.expectEmit(true, true, true, true, address(assetToken_arb));
        emit IERC20.Transfer(address(vaultComposer), address(vault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC20.Transfer(address(0), address(vaultComposer), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(vault_arb));
        emit IERC4626.Deposit(
            address(vaultComposer),
            address(vaultComposer),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND
        );

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Sent(guid);

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vaultComposer)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vault_arb)), TOKENS_TO_SEND);
        assertEq(vault_arb.totalSupply(), vault_arb.balanceOf(address(userA)), TOKENS_TO_SEND);
    }

    function test_lzCompose_pass_dst_is_hub_no_msgValue_causes_refund() public {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);
        uint256 userABalanceEth = assetOFT_eth.balanceOf(userA);

        SendParam memory internalSendParam = SendParam(
            vaultComposer.VAULT_EID(),
            addressToBytes32(userA),
            TOKENS_TO_SEND,
            0,
            "",
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 1 wei, TOKENS_TO_SEND, userA);

        /// @dev Internal revert on try...catch
        /// vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.NoMsgValueExpected.selector));

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Refunded(guid);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(
            assetOFT_eth.balanceOf(userA),
            userABalanceEth + TOKENS_TO_SEND,
            "userA should have received refund on Ethereum"
        );
    }

    function test_lzCompose_fail_invalid_payload_auto_refunds() public {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);
        uint256 userABalanceEth = assetOFT_eth.balanceOf(userA);

        bytes memory invalidComposeMsg = abi.encode(bytes("0x1234"), 5);
        bytes memory composeMsg = _createComposePayload(ETH_EID, invalidComposeMsg, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(vaultComposer));
        emit IVaultComposerSync.Refunded(guid);

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        verifyPackets(ETH_EID, address(assetOFT_eth));
        assertEq(
            assetOFT_eth.balanceOf(userA),
            userABalanceEth + TOKENS_TO_SEND,
            "userA should have received refund on Ethereum"
        );
    }

    function test_lzCompose_slippage_causes_refund() public {
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

        assertEq(assetToken_arb.totalSupply(), assetToken_arb.balanceOf(address(vaultComposer)), TOKENS_TO_SEND);
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
    }

    function test_InsufficientMsgValue_causes_revert_no_refund() public {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userB), TOKENS_TO_SEND, 0, "", "", "");
        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 10 ether, msgValueToFail, userA);

        vm.expectRevert(abi.encodeWithSelector(IVaultComposerSync.InsufficientMsgValue.selector, 10 ether, 1 ether));

        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");
    }

    function test_lzCompose_fail_not_enough_value_for_refund_complete_revert() public {
        bytes32 guid = _randomGUID();
        _feedAssets(address(vaultComposer), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(POL_EID, addressToBytes32(userA), TOKENS_TO_SEND, 0, "", "", "");
        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, 0, TOKENS_TO_SEND, userA);

        vm.expectRevert(abi.encodeWithSelector(Errors.LZ_InsufficientFee.selector, 200110716, 1, 0, 0)); /// @dev 200110716 is quoteSend value
        vm.prank(arbEndpoint);
        vaultComposer.lzCompose{ value: 1 wei }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");
    }
}
