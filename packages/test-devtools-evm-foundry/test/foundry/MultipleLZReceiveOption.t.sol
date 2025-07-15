// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// Forge
import { console } from "forge-std/Test.sol";

import { ExecutorOptions } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/ExecutorOptions.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { LzTestHelperSlim } from "../../contracts/LzTestHelperSlim.sol";

contract MultipleLZReceiveOptionTest is LzTestHelperSlim {
    using OptionsBuilder for bytes;

    function setUp() public virtual override {}

    function test_SingleParseExecutorLzReceiveOption_OnlyGas() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);
        console.logBytes(options);

        (uint256 gas, uint256 value) = _parseExecutorLzReceiveOption(options);
        assertEq(gas, 200_000, "gas value mismatch");
        assertEq(value, 0, "value mismatch");
    }

    function test_SingleParseExecutorLzReceiveOption_GasValue() public {
        uint128 UINT128_MAX = type(uint128).max;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(UINT128_MAX, UINT128_MAX);

        (uint256 gas, uint256 value) = _parseExecutorLzReceiveOption(options);
        assertEq(gas, UINT128_MAX, "gas value mismatch");
        assertEq(value, UINT128_MAX, "value mismatch");
    }

    function test_MultiParseExecutorLzReceiveOption_OnlyGas() public {
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(100_000, 0)
            .addExecutorLzReceiveOption(200_000, 0)
            .addExecutorLzReceiveOption(300_000, 0);

        (uint256 gas, uint256 value) = _parseExecutorLzReceiveOption(options);
        assertEq(gas, 600_000, "gas value mismatch");
        assertEq(value, 0, "value mismatch");
    }

    function test_MultiParseExecutorLzReceiveOption_GasValue() public {
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(100_000, 100_000)
            .addExecutorLzReceiveOption(200_000, 100_000)
            .addExecutorLzReceiveOption(300_000, 100_000);

        (uint256 gas, uint256 value) = _parseExecutorLzReceiveOption(options);
        assertEq(gas, 600_000, "gas value mismatch");
        assertEq(value, 300_000, "value mismatch");
    }

    /*

    * AFAIK this test is not possible in foundry because of how expectRevert works
    * expectRevert as of commit: forge 0.2.0 (f79c53c 2024-10-10T00:22:07.140866196Z) throws an error ONLY if the next call reverts
    * in this case the next call is "(bytes memory executorOpts, ) = ulnOptions.decode(_options);" and the expectRevert fails
    * https://book.getfoundry.sh/cheatcodes/expect-revert
    
    function test_overflowGasRevert() public {
        bytes memory options1 = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(type(uint128).max, 0)
            .addExecutorLzReceiveOption(1, 0);

        vm.expectRevert();
        _parseExecutorLzReceiveOption(options1);

        bytes memory options2 = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(type(uint128).max, 0)
            .addExecutorLzReceiveOption(type(uint128).max, 0);

        vm.expectRevert();
        _parseExecutorLzReceiveOption(options2);
    }
    */
}
