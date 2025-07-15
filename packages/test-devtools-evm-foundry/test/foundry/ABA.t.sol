// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Mock imports
import { ABAMock as ABA } from "../../contracts/mocks/ABAMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { MessagingFee, MessagingReceipt, Origin } from "@layerzerolabs/oft-evm/contracts/OFTCore.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// Forge imports
import "forge-std/console.sol";
import { Vm } from "forge-std/Test.sol";
import "forge-std/Test.sol";

// DevTools imports
import { LzTestHelperSlim } from "../../contracts/LzTestHelperSlim.sol";

contract ABATest is LzTestHelperSlim {
    using OptionsBuilder for bytes;

    uint32 aEid = 1;
    uint32 bEid = 2;

    uint16 SEND = 1;
    uint16 SEND_ABA = 2;
        
    ABA aSender;
    ABA bReceiver;

    address public userA = address(0x1);
    address public userB = address(0x2);
    uint256 public initialBalance = 100 ether;

    string public _a = "A";
    string public _b = "B";

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints(2);

        aSender = ABA(
            payable(_deployOApp(type(ABA).creationCode, abi.encode(address(endpoints[aEid]), address(this))))
        );

        bReceiver = ABA(
            payable(_deployOApp(type(ABA).creationCode, abi.encode(address(endpoints[bEid]), address(this))))
        );

        // config and wire the
        address[] memory oapps = new address[](2);
        oapps[0] = address(aSender);
        oapps[1] = address(bReceiver);
        this.wireOApps(oapps);
    }

    function test_combine_options() public {
        EnforcedOptionParam[] memory aEnforcedOptions = new EnforcedOptionParam[](2);
        aEnforcedOptions[0] = EnforcedOptionParam({eid: bEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)});
        aEnforcedOptions[1] = EnforcedOptionParam({eid: bEid, msgType: SEND_ABA, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(500000, 0)});
        
        EnforcedOptionParam[] memory bEnforcedOptions = new EnforcedOptionParam[](2);
        bEnforcedOptions[0] = EnforcedOptionParam({eid: aEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)});
        bEnforcedOptions[1] = EnforcedOptionParam({eid: aEid, msgType: SEND_ABA, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)});
        
        aSender.setEnforcedOptions(aEnforcedOptions);
        bReceiver.setEnforcedOptions(bEnforcedOptions);

        bytes memory _extraReturnOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0); // gas settings for B -> A

        // Quote the return call B -> A.
        MessagingFee memory returnFee = bReceiver.quote(aEid, SEND, "Remote chain says hello!", _extraReturnOptions, OptionsBuilder.newOptions(), false);

        bytes memory _extraSendOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(100000, uint128(returnFee.nativeFee)); // gas settings for A -> B
        
        // @dev This presence of duplicated options is handled off-chain in the verifier/executor.
        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(500000, 0).addExecutorLzReceiveOption(100000, uint128(returnFee.nativeFee));
        
        bytes memory combinedOptions = aSender.combineOptions(bEid, SEND_ABA, _extraSendOptions);
        assertEq(combinedOptions, expectedOptions);
    }
    
    function test_aba() public {
        
        EnforcedOptionParam[] memory aEnforcedOptions = new EnforcedOptionParam[](2);
        // Send gas for lzReceive (A -> B).
        aEnforcedOptions[0] = EnforcedOptionParam({eid: bEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)}); // gas limit, msg.value
        // Send gas for lzReceive + msg.value for nested lzSend (A -> B -> A).
        aEnforcedOptions[1] = EnforcedOptionParam({eid: bEid, msgType: SEND_ABA, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(600000, 200000)});
        
        EnforcedOptionParam[] memory bEnforcedOptions = new EnforcedOptionParam[](2);
        // Send gas for lzReceive (A -> B).
        bEnforcedOptions[0] = EnforcedOptionParam({eid: aEid, msgType: SEND, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0)});
        // Send gas for lzReceive (B -> A).
        bEnforcedOptions[1] = EnforcedOptionParam({eid: aEid, msgType: SEND_ABA, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(600000, 200000)});
        
        aSender.setEnforcedOptions(aEnforcedOptions);
        bReceiver.setEnforcedOptions(bEnforcedOptions);

        bytes memory _extraReturnOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(50000, 0); // gas settings for B -> A

        // Quote the return call B -> A.
        MessagingFee memory returnFee = bReceiver.quote(aEid, SEND, "Chain B says goodbye!", _extraReturnOptions, OptionsBuilder.newOptions(), false);

        bytes memory _extraSendOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(100000, uint128(returnFee.nativeFee)); // gas settings for A -> B

        // Use the return call quote to generate a new quote for A -> B.
        // src chain cost + price of gas that I want to send + fees for my chosen security Stack / Executor
        MessagingFee memory sendFee = aSender.quote(bEid, SEND_ABA, "Chain A says hello!", _extraSendOptions, _extraReturnOptions, false);
        
        // Use the new quote for the msg.value of the send call.
        vm.startPrank(userA);
        aSender.send{value: sendFee.nativeFee}(
            bEid,
            SEND_ABA,
            "Chain A says hello!",
            _extraSendOptions,
            _extraReturnOptions
        );

        verifyPackets(bEid, addressToBytes32(address(bReceiver)));

        verifyPackets(aEid, addressToBytes32(address(aSender)));

        assertEq(bReceiver.data(), "Chain A says hello!");
        assertEq(aSender.data(), "Chain B says goodbye!");
    }
}