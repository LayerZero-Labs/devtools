// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { IHyperLiquidComposerErrors } from "../contracts/interfaces/IHyperLiquidComposerErrors.sol";

import { HyperLiquidComposer } from "../contracts/HyperLiquidComposer.sol";

import { HyperliquidBaseTest } from "./HyperliquidBase.t.sol";
import { console } from "forge-std/Test.sol";

contract HyperLiquidComposerRevertTest is HyperliquidBaseTest {
    function setUp() public override {
        super.setUp();

        // Mocks the lzReceive call which mints the tokens to the hyperLiquidComposer
        deal(address(oft), address(hyperLiquidComposer), AMOUNT_TO_SEND);
    }

    function test_unauthorized_call_not_endpoint() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotEndpoint.selector,
            address(HL_LZ_ENDPOINT_V2),
            address(this)
        );

        vm.expectRevert(revertMessage);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), "", msg.sender, "");
    }

    function test_unauthorized_call_not_oft() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotOFT.selector,
            address(oft),
            address(0)
        );
        vm.expectRevert(revertMessage, address(hyperLiquidComposer));

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(0), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }

    function test_panic_invalid_message() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidComposeMessage.selector,
            ""
        );
        vm.expectRevert(revertMessage, address(hyperLiquidComposer));

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }
}
