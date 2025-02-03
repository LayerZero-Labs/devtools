// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Mock imports
import { BatchSendMock as BatchSend } from "../../contracts/mocks/BatchSendMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// Forge imports
import "forge-std/console.sol";
import { Vm } from "forge-std/Test.sol";
import "forge-std/Test.sol";

// DevTools imports
import { TestHelperOz5 } from "../../contracts/TestHelperOz5.sol";

contract BatchSendTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 aEid = 1;
    uint32 bEid = 2;
    uint32 cEid = 3;
    uint32 dEid = 4;

    uint16 SEND = 1;
        
    BatchSend aSender;

    BatchSend bReceiver;
    BatchSend cReceiver;
    BatchSend dReceiver;

    address public userA = address(0x1);
    address public userB = address(0x2);
    address public userC = address(0x3);
    address public userD = address(0x4);

    uint256 public initialBalance = 100 ether;

    string public _a = "A";
    string public _b = "B";
    string public _c = "C";
    string public _d = "D";

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        vm.deal(userC, 1000 ether);
        vm.deal(userD, 1000 ether);

        super.setUp();
        setUpEndpoints(4, LibraryType.UltraLightNode);

        aSender = BatchSend(
            payable(_deployOApp(type(BatchSend).creationCode, abi.encode(address(endpoints[aEid]), address(this))))
        );

        bReceiver = BatchSend(
            payable(_deployOApp(type(BatchSend).creationCode, abi.encode(address(endpoints[bEid]), address(this))))
        );

        cReceiver = BatchSend(
            payable(_deployOApp(type(BatchSend).creationCode, abi.encode(address(endpoints[cEid]), address(this))))
        );

        dReceiver = BatchSend(
            payable(_deployOApp(type(BatchSend).creationCode, abi.encode(address(endpoints[dEid]), address(this))))
        );

        // config and wire the
        address[] memory oapps = new address[](4);
        oapps[0] = address(aSender);
        oapps[1] = address(bReceiver);
        oapps[2] = address(cReceiver);
        oapps[3] = address(dReceiver);
        this.wireOApps(oapps);
    }
    
    function test_batch_send() public {
        
        EnforcedOptionParam[] memory aEnforcedOptions = new EnforcedOptionParam[](3);
        // Send gas for lzReceive (A -> B).
        aEnforcedOptions[0] = EnforcedOptionParam({eid: bEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)}); // gas limit, msg.value
        aEnforcedOptions[1] = EnforcedOptionParam({eid: cEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)}); // gas limit, msg.value
        aEnforcedOptions[2] = EnforcedOptionParam({eid: dEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)}); // gas limit, msg.value
        
        aSender.setEnforcedOptions(aEnforcedOptions);

        bytes memory _extraSendOptions = OptionsBuilder.newOptions(); // extra gas limit and msg.value to request for A -> B

        uint32[] memory _dstEids = new uint32[](3);
        _dstEids[0] = bEid;
        _dstEids[1] = cEid;
        _dstEids[2] = dEid;

        // Use the return call quote to generate a new quote for A -> B.
        // src chain cost + price of gas that I want to send + fees for my chosen security Stack / Executor
        MessagingFee memory sendFee = aSender.quote(_dstEids, SEND, "Chain A says hello!", _extraSendOptions, false);

        // Use the new quote for the msg.value of the send call.
        vm.prank(userA);
        aSender.send{value: sendFee.nativeFee}(
            _dstEids,
            SEND,
            "Chain A says hello!",
            _extraSendOptions
        );

        verifyPackets(bEid, addressToBytes32(address(bReceiver)));
        verifyPackets(cEid, addressToBytes32(address(cReceiver)));
        verifyPackets(dEid, addressToBytes32(address(dReceiver)));


        assertEq(bReceiver.data(), "Chain A says hello!");
        assertEq(cReceiver.data(), "Chain A says hello!");
        assertEq(dReceiver.data(), "Chain A says hello!");
    }
}