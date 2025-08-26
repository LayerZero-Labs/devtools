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

    function test_insuffient_gas_revert() public {
        uint256 gasToPass = 150_000;

        /// @dev The error message is thrown on the following selector. This can't be hardcoded into the test because live network gas costs change
        // uint256 gasConsumed = 5_984;
        // uint256 minGas = hyperLiquidComposer.MIN_GAS();
        // vm.expectRevert(abi.encodeWithSelector(
        //         IHyperLiquidComposerErrors.InsufficientGas.selector,
        //         (gasToPass - gasConsumed),
        //         minGas
        //     ))

        vm.expectRevert();
        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose{ gas: gasToPass }(address(oft), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }

    function test_unauthorized_call_not_endpoint() public {
        vm.expectRevert(IHyperLiquidComposerErrors.OnlyEndpoint.selector);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), "", msg.sender, "");
    }

    function test_unauthorized_call_not_oft() public {
        bytes memory revertMessage = abi.encodeWithSelector(
            IHyperLiquidComposerErrors.InvalidComposeCaller.selector,
            address(oft),
            address(0)
        );
        vm.expectRevert(revertMessage, address(hyperLiquidComposer));

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(0), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }

    function test_panic_invalid_message() public {
        vm.expectRevert();

        vm.startPrank(HL_LZ_ENDPOINT_V2);
        hyperLiquidComposer.lzCompose(address(oft), bytes32(0), "", msg.sender, "");
        vm.stopPrank();
    }
}
