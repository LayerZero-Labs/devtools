// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// Forge
import { console } from "forge-std/Test.sol";

import { ExecutorOptions } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/ExecutorOptions.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { LzTestHelperSlim } from "../../contracts/LzTestHelperSlim.sol";

contract MultipleNativeDropOptionTest is LzTestHelperSlim {
    using OptionsBuilder for bytes;

    bytes32 receiver = keccak256(abi.encodePacked("receiver"));
    function setUp() public virtual override {}

    function test_SingleParseExecutorLzNativeDropOption_OnlyGas() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorNativeDropOption(200_000, receiver);

        (uint256 _value, bytes32 _receiver) = _parseExecutorNativeDropOption(options);
        assertEq(_value, 200_000, "amount mismatch");
        assertEq(_receiver, receiver, "receiver mismatch");
    }

    function test_SingleParseExecutorNativeDropOption_GasValue() public {
        uint128 UINT128_MAX = type(uint128).max;
        bytes memory options = OptionsBuilder.newOptions().addExecutorNativeDropOption(UINT128_MAX, receiver);

        (uint256 _value, bytes32 _receiver) = _parseExecutorNativeDropOption(options);
        assertEq(_value, UINT128_MAX, "amount mismatch");
        assertEq(_receiver, receiver, "receiver mismatch");
    }

    function test_MultiParseExecutorNativeDropOption_OnlyGas() public {
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorNativeDropOption(100_000, receiver)
            .addExecutorNativeDropOption(200_000, receiver)
            .addExecutorNativeDropOption(300_000, receiver);

        (uint256 _value, bytes32 _receiver) = _parseExecutorNativeDropOption(options);
        assertEq(_value, 600_000, "amount mismatch");
        assertEq(_receiver, receiver, "receiver mismatch");
    }

    function test_MultiParseExecutorNativeDropOption_GasValue() public {
        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorNativeDropOption(100_000, receiver)
            .addExecutorNativeDropOption(200_000, receiver)
            .addExecutorNativeDropOption(300_000, receiver);

        (uint256 _value, bytes32 _receiver) = _parseExecutorNativeDropOption(options);
        assertEq(_value, 600_000, "amount mismatch");
        assertEq(_receiver, receiver, "receiver mismatch");
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
