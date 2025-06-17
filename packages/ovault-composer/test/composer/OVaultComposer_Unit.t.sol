// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// OApp imports
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import { OVaultComposerBaseTest } from "./OVaultComposer_Base.t.sol";

import { IOVaultComposer } from "../../contracts/interfaces/IOVaultComposer.sol";

import { console } from "forge-std/console.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC4626Adapter } from "../../contracts/interfaces/IERC4626Adapter.sol";

contract OVaultComposerUnitTest is OVaultComposerBaseTest {
    using OptionsBuilder for bytes;

    function setUp() public virtual override {
        super.setUp();
    }

    function test_deployment() public view {
        assertEq(OVaultComposerArb.OVAULT(), address(oVault_arb));
        assertEq(OVaultComposerArb.SHARE_OFT(), address(shareOFT_arb));
        assertEq(OVaultComposerArb.ASSET_OFT(), address(assetOFT_arb));
        assertEq(OVaultComposerArb.OPTIMISTICALLY_CONVERT_TOKENS(), true);
    }

    function test_onlyEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.OnlyEndpoint.selector, address(this)));
        OVaultComposerArb.lzCompose(address(assetOFT_arb), _randomGUID(), "", userA, "");
    }

    function test_onlyOFTMesh(address _oft) public {
        vm.assume(_oft != address(assetOFT_arb) && _oft != address(shareOFT_arb));

        vm.expectRevert(abi.encodeWithSelector(IOVaultComposer.OnlyOFT.selector, _oft));
        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(_oft, _randomGUID(), "", arbExecutor, "");
    }

    function test_lzCompose_pass() public {
        bytes32 guid = _randomGUID();
        assetOFT_arb.mint(address(OVaultComposerArb), TOKENS_TO_SEND);

        SendParam memory internalSendParam = SendParam(
            POL_EID,
            addressToBytes32(userA),
            TOKENS_TO_SEND,
            0,
            OPTIONS_LZRECEIVE_2M,
            "",
            ""
        );

        bytes memory composeMsg = _createComposePayload(ETH_EID, internalSendParam, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(assetOFT_arb));
        emit IERC20.Transfer(address(OVaultComposerArb), address(oVault_arb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(shareOFT_arb));
        emit IERC20.Transfer(address(0), address(OVaultComposerArb), TOKENS_TO_SEND);

        vm.expectEmit(true, true, true, true, address(oVault_arb));
        emit IERC4626Adapter.Deposit(
            address(OVaultComposerArb),
            address(OVaultComposerArb),
            TOKENS_TO_SEND,
            TOKENS_TO_SEND
        );

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.Sent(guid, address(shareOFT_arb));

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(OVaultComposerArb)), TOKENS_TO_SEND);
        assertEq(shareOFT_arb.totalSupply(), 0);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        assertEq(assetOFT_arb.totalSupply(), assetOFT_arb.balanceOf(address(oVault_arb)), TOKENS_TO_SEND);
        assertEq(shareOFT_arb.totalSupply(), 0);
    }

    function test_lzCompose_fail_invalid_payload() public {
        bytes32 guid = _randomGUID();
        deal(address(assetOFT_arb), address(OVaultComposerArb), TOKENS_TO_SEND);

        bytes memory invalidPayload = bytes("0x1234");

        bytes memory composeMsg = _createComposePayload(ETH_EID, invalidPayload, TOKENS_TO_SEND, userA);

        vm.expectEmit(true, true, true, true, address(OVaultComposerArb));
        emit IOVaultComposer.DecodeFailed(guid, address(assetOFT_arb), invalidPayload);

        vm.prank(arbEndpoint);
        OVaultComposerArb.lzCompose{ value: 1 ether }(address(assetOFT_arb), guid, composeMsg, arbExecutor, "");

        (address oft, address refundOFT, SendParam memory sendParam) = OVaultComposerArb.failedMessages(guid);

        assertEq(refundOFT, address(assetOFT_arb), "refundOFT should be assetOFT_arb");
        assertEq(oft, address(0), "retry oft should be 0 - not possible");
        assertEq(sendParam.dstEid, ETH_EID, "retry dstEid should be ETH_EID");
        assertEq(sendParam.to, addressToBytes32(userA), "retry to should be userA");
        assertEq(sendParam.amountLD, TOKENS_TO_SEND, "retry amountLD should be TOKENS_TO_SEND");
        assertEq(sendParam.minAmountLD, 0, "retry minAmountLD should be 0");
        assertEq(sendParam.extraOptions, "", "retry extraOptions should be empty");
    }
}
