// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";
import { Errors } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/Errors.sol";

import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

import { OmniCounter, MsgCodec } from "./mocks/OmniCounter.sol";

import { TestHelperOz5 } from "../../contracts/TestHelperOz5.sol";

import "forge-std/console.sol";

contract OmniCounterTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 aEid = 1;
    uint32 bEid = 2;

    // omnicounter with precrime
    OmniCounter aCounter;
    OmniCounter bCounter;

    address offchain = address(0xDEAD);

    error CrimeFound(bytes crime);

    function setUp() public virtual override {
        super.setUp();

        setUpEndpoints(2, LibraryType.UltraLightNode);

        address[] memory uas = setupOApps(type(OmniCounter).creationCode, 1, 2);
        aCounter = OmniCounter(payable(uas[0]));
        bCounter = OmniCounter(payable(uas[1]));
    }

    function test_lzCompose_increment() public {
        uint256 countBefore = bCounter.count();
        uint256 composedCountBefore = bCounter.composedCount();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 200000, 0);
        (uint256 nativeFee, ) = aCounter.quote(bEid, MsgCodec.COMPOSED_TYPE, options);
        aCounter.increment{ value: nativeFee }(bEid, MsgCodec.COMPOSED_TYPE, options);

        verifyPackets(bEid, addressToBytes32(address(bCounter)), 0, address(bCounter));

        assertEq(bCounter.count(), countBefore + 1, "increment B1 assertion failure");
        assertEq(bCounter.composedCount(), composedCountBefore + 1, "increment B2 assertion failure");
    }
}