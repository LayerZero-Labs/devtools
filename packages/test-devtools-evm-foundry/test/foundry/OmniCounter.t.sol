// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";
import { Errors } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/Errors.sol";

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { OmniCounterMock as OmniCounter, MsgCodec } from "../../contracts/mocks/OmniCounterMock.sol";

import { TestHelperOz5 } from "../../contracts/TestHelperOz5.sol";
import { EndpointV2Mock } from "../../contracts/mocks/EndpointV2Mock.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

import "forge-std/console.sol";

contract OmniCounterTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 aEid = 1;
    uint32 bEid = 2;

    OmniCounter aCounter;
    OmniCounter bCounter;

    function setUp() public virtual override {
        super.setUp();

        setUpEndpoints(2, LibraryType.UltraLightNode);

        address[] memory uas = setupOApps(type(OmniCounter).creationCode, 1, 2);
        aCounter = OmniCounter(payable(uas[0]));
        bCounter = OmniCounter(payable(uas[1]));
    }

    // classic message passing A -> B
    function test_increment(uint8 numIncrements) public {
        vm.assume(numIncrements > 0 && numIncrements < 10); // upper bound to ensure tests don't run too long
        uint256 counterBefore = bCounter.count();

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        (uint256 nativeFee, ) = aCounter.quote(bEid, MsgCodec.VANILLA_TYPE, options);
        for (uint8 i = 0; i < numIncrements; i++) {
            aCounter.increment{ value: nativeFee }(bEid, MsgCodec.VANILLA_TYPE, options);
        }
        assertEq(bCounter.count(), counterBefore, "shouldn't be increased until packet is verified");

        // verify packet to bCounter manually
        verifyPackets(bEid, addressToBytes32(address(bCounter)));

        assertEq(bCounter.count(), counterBefore + numIncrements, "increment assertion failure");
    }

    function test_batchIncrement(uint256 batchSize) public {
        vm.assume(batchSize > 0 && batchSize < 10);

        uint256 counterBefore = bCounter.count();

        uint32[] memory eids = new uint32[](batchSize);
        uint8[] memory types = new uint8[](batchSize);
        bytes[] memory options = new bytes[](batchSize);
        bytes memory option = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        uint256 fee;
        for (uint256 i = 0; i < batchSize; i++) {
            eids[i] = bEid;
            types[i] = MsgCodec.VANILLA_TYPE;
            options[i] = option;
            (uint256 nativeFee, ) = aCounter.quote(eids[i], types[i], options[i]);
            fee += nativeFee;
        }

        vm.expectRevert(); // Errors.InvalidAmount
        aCounter.batchIncrement{ value: fee - 1 }(eids, types, options);

        aCounter.batchIncrement{ value: fee }(eids, types, options);
        verifyPackets(bEid, addressToBytes32(address(bCounter)));

        assertEq(bCounter.count(), counterBefore + batchSize, "batchIncrement assertion failure");
    }

    function test_nativeDrop_increment(uint128 nativeDropGas) public {
        vm.assume(nativeDropGas <= 100000000000000000); // avoid encountering Executor_NativeAmountExceedsCap
        uint256 balanceBefore = address(bCounter).balance;

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorNativeDropOption(nativeDropGas, addressToBytes32(address(bCounter)));
        (uint256 nativeFee, ) = aCounter.quote(bEid, MsgCodec.VANILLA_TYPE, options);
        aCounter.increment{ value: nativeFee }(bEid, MsgCodec.VANILLA_TYPE, options);

        // verify packet to bCounter manually
        verifyPackets(bEid, addressToBytes32(address(bCounter)));

        assertEq(address(bCounter).balance, balanceBefore + nativeDropGas, "nativeDrop assertion failure");

        // transfer funds out
        address payable receiver = payable(address(0xABCD));

        // withdraw with non admin
        vm.startPrank(receiver);
        vm.expectRevert();
        bCounter.withdraw(receiver, nativeDropGas);
        vm.stopPrank();

        // withdraw with admin
        bCounter.withdraw(receiver, nativeDropGas);
        assertEq(address(bCounter).balance, 0, "withdraw assertion failure");
        assertEq(receiver.balance, nativeDropGas, "withdraw assertion failure");
    }

    // classic message passing A -> B1 -> B2
    function test_lzCompose_increment() public {
        uint256 countBefore = bCounter.count();
        uint256 composedCountBefore = bCounter.composedCount();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 200000, 0);
        (uint256 nativeFee, ) = aCounter.quote(bEid, MsgCodec.COMPOSED_TYPE, options);
        MessagingReceipt memory msgReceipt = aCounter.increment{ value: nativeFee }(bEid, MsgCodec.COMPOSED_TYPE, options);

        verifyPackets(bEid, addressToBytes32(address(bCounter)));

        this.lzCompose(bEid, address(bCounter), options, msgReceipt.guid, address(bCounter), MsgCodec.encode(MsgCodec.COMPOSED_TYPE, aEid));

        assertEq(bCounter.count(), countBefore + 1, "increment B1 assertion failure");
        assertEq(bCounter.composedCount(), composedCountBefore + 1, "increment B2 assertion failure");
    }

    // A -> B -> A
    function test_ABA_increment() public {
        uint256 countABefore = aCounter.count();
        uint256 countBBefore = bCounter.count();

        bytes memory BA_options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 10);
        (uint256 BA_nativeFee, ) = bCounter.quote(aEid, MsgCodec.VANILLA_TYPE, BA_options);

        // FIXME: this is a hack to ensure the native fee is greater than the gas limit
        BA_nativeFee += 1e8;

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(10000000, uint128(BA_nativeFee));
        (uint256 nativeFee, ) = aCounter.quote(bEid, MsgCodec.ABA_TYPE, options);
        console.log("nativeFee", nativeFee);
        aCounter.increment{ value: nativeFee }(bEid, MsgCodec.ABA_TYPE, options);

        verifyPackets(bEid, addressToBytes32(address(bCounter)));
        
        assertEq(aCounter.count(), countABefore, "increment A assertion failure");
        assertEq(bCounter.count(), countBBefore + 1, "increment B assertion failure");

        verifyPackets(aEid, addressToBytes32(address(aCounter)));
        assertEq(aCounter.count(), countABefore + 1, "increment A assertion failure");
    }

    // // A -> B1 -> B2 -> A
    function test_lzCompose_ABA_increment() public {
        uint256 countABefore = aCounter.count();
        uint256 countBBefore = bCounter.count();
        uint256 composedCountBBefore = bCounter.composedCount();

        bytes memory BA_options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        (uint256 BA_nativeFee, ) = bCounter.quote(aEid, MsgCodec.VANILLA_TYPE, BA_options);

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 10000000, uint128(BA_nativeFee));

        (uint256 nativeFee, ) = aCounter.quote(bEid, MsgCodec.COMPOSED_ABA_TYPE, options);
        MessagingReceipt memory msgReceipt = aCounter.increment{ value: nativeFee }(bEid, MsgCodec.COMPOSED_ABA_TYPE, options);

        verifyPackets(bEid, addressToBytes32(address(bCounter)));

        this.lzCompose(bEid, address(bCounter), options, msgReceipt.guid, address(bCounter), MsgCodec.encode(MsgCodec.COMPOSED_ABA_TYPE, aEid));

        assertEq(bCounter.count(), countBBefore + 1, "increment B1 assertion failure");
        assertEq(bCounter.composedCount(), composedCountBBefore + 1, "increment B2 assertion failure");

        verifyPackets(aEid, addressToBytes32(address(aCounter)));
        assertEq(aCounter.count(), countABefore + 1, "increment A assertion failure");
    }
}