// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Mock imports
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { MintBurnERC20Mock } from "./mocks/MintBurnERC20Mock.sol";
import { OFTComposerMock } from "./mocks/OFTComposerMock.sol";
import { OFTAdapterDoubleSidedRateLimiterMock } from "./mocks/OFTAdapterDoubleSidedRateLimiterMock.sol";
import { MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiterMock } from "./mocks/MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiterMock.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OFT imports
import { OFTAdapterDoubleSidedRateLimiter } from "../contracts/OFTAdapterDoubleSidedRateLimiter.sol";
import { MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter } from "../contracts/MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter.sol";
import { DoubleSidedRateLimiter } from "@layerzerolabs/oapp-evm/contracts/oapp/utils/DoubleSidedRateLimiter.sol";
import { IOFT, SendParam, OFTReceipt } from "../contracts/interfaces/IOFT.sol";
import { MessagingFee, MessagingReceipt, Origin } from "../contracts/OFTCore.sol";
import { OFTMsgCodec } from "../contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "../contracts/libs/OFTComposeMsgCodec.sol";
import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";
import { DoubleEndedQueue } from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// DevTools imports
import { TestHelperOz5WithRevertAssertions } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5WithRevertAssertions.sol";

contract OFTAdapterDoubleSidedRateLimiterTest is TestHelperOz5WithRevertAssertions {
    using OptionsBuilder for bytes;
    using PacketV1Codec for bytes;
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;

    uint32 aEid = 1;
    uint32 bEid = 2;
    uint32 cEid = 3;

    ERC20Mock aToken;
    MintBurnERC20Mock bToken;
    MintBurnERC20Mock cToken;

    OFTAdapterDoubleSidedRateLimiter aOFT;
    MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter bOFT;
    MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter cOFT;

    address public userA = address(0x1);
    address public userB = address(0x2);
    address public userC = address(0x3);
    uint256 public initialBalance = 100 ether;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        vm.deal(userC, 1000 ether);

        
        // The outbound (send) rate limits for OFT A.
        DoubleSidedRateLimiter.RateLimitConfig[] memory aOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 10 ether, window: 60 seconds});

        // The inbound (receive) rate limits for OFT A.
        DoubleSidedRateLimiter.RateLimitConfig[] memory aInboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aInboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 10 ether, window: 60 seconds});

        // The outbound (send) rate limits for OFT B.
        DoubleSidedRateLimiter.RateLimitConfig[] memory bOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        bOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: aEid, limit: 10 ether, window: 60 seconds});

        // The inbound (receive) rate limits for OFT B.
        DoubleSidedRateLimiter.RateLimitConfig[] memory bInboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        bInboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: aEid, limit: 10 ether, window: 60 seconds});

        // The outbound (send) rate limits for OFT C (only limits to A).
        DoubleSidedRateLimiter.RateLimitConfig[] memory cOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        cOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: aEid, limit: 10 ether, window: 60 seconds});
        
        // The inbound (receive) rate limits for OFT C (only limits from A).
        DoubleSidedRateLimiter.RateLimitConfig[] memory cInboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        cInboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: aEid, limit: 10 ether, window: 60 seconds});

        super.setUp();
        setUpEndpoints(3, LibraryType.UltraLightNode);

        aToken = new ERC20Mock("aToken", "aToken");
        bToken = new MintBurnERC20Mock("bToken", "bToken");
        cToken = new MintBurnERC20Mock("cToken", "cToken");

        aOFT = OFTAdapterDoubleSidedRateLimiter(
            _deployOApp(type(OFTAdapterDoubleSidedRateLimiterMock).creationCode, abi.encode(address(aToken), address(endpoints[aEid]), address(this)))
        );
        aOFT.setRateLimits(aOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);
        aOFT.setRateLimits(aInboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Inbound);

        bOFT = MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter(
            _deployOApp(type(MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiterMock).creationCode, abi.encode(address(bToken), address(endpoints[bEid]), address(this)))
        );
        bOFT.setRateLimits(bOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);
        bOFT.setRateLimits(bInboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Inbound);

        cOFT = MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiter(
            _deployOApp(type(MintAndAllowanceBurnOFTAdapterDoubleSidedRateLimiterMock).creationCode, abi.encode(address(cToken), address(endpoints[cEid]), address(this)))
        );
        cOFT.setRateLimits(cOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);
        cOFT.setRateLimits(cInboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Inbound);

        // config and wire the ofts
        address[] memory ofts = new address[](3);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFT);
        this.wireOApps(ofts);

        // mint tokens
        aToken.mint(userA, initialBalance);
        bToken.mint(userB, initialBalance);
        cToken.mint(userC, initialBalance);
    }

    function test_constructor() public view {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));
        assertEq(cOFT.owner(), address(this));

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);
        assertEq(cToken.balanceOf(userC), initialBalance);

        assertEq(aOFT.token(), address(aToken));
        assertEq(bOFT.token(), address(bToken));
        assertEq(cOFT.token(), address(cToken));
    }

    function test_set_rates() public {
        // The outbound (send) rate limits for OFT A.
        DoubleSidedRateLimiter.RateLimitConfig[] memory aNewOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aNewOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 1.9 ether, window: 59 seconds});
        aOFT.setRateLimits(aNewOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        uint256 tokensToSend = 2 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        // User A call send two times within the allowed outbound window.
        vm.startPrank(userA);
        vm.expectRevert(DoubleSidedRateLimiter.RateLimitExceeded.selector);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
    }

    function test_set_rates_only_apply_per_direction() public {
        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(cToken.balanceOf(userC), initialBalance);
        
        // The outbound (send) rate limits for OFT A only allows to send 2.5 tokens every 60 seconds.
        DoubleSidedRateLimiter.RateLimitConfig[] memory aNewOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aNewOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 2.5 ether, window: 60 seconds});
        aOFT.setRateLimits(aNewOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        // The inbound (receive) rate limits for OFT B allows for 5 tokens to be received every 60 seconds..
        DoubleSidedRateLimiter.RateLimitConfig[] memory bNewInboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        bNewInboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: aEid, limit: 5 ether, window: 60 seconds});
        bOFT.setRateLimits(bNewInboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Inbound);

        uint256 tokensToSend = 2.5 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory _sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(_sendParam, false);

        // User A calls send twice which loads two packets with a total of 5 tokens inside.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(_sendParam, fee, payable(address(this)));
        skip(60 seconds);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(_sendParam, fee, payable(address(this)));
        vm.stopPrank();

        // Verify and execute those packets all at once to test if the inbound rate limit applies.
        verifyPackets(bEid, addressToBytes32(address(bOFT)));
        // verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend * 2);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend * 2);
    }

    function test_set_rates_only_apply_per_pathway() public {
        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(cToken.balanceOf(userC), initialBalance);

        // The outbound (send) rate limits for OFT A.
        DoubleSidedRateLimiter.RateLimitConfig[] memory aNewOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](2);
        aNewOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 1.9 ether, window: 59 seconds});
        aNewOutboundConfigs[1] = DoubleSidedRateLimiter.RateLimitConfig({eid: cEid, limit: 2 ether, window: 60 seconds});
        aOFT.setRateLimits(aNewOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);

        uint256 tokensToSend = 2 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParamToEndpointC = SendParam(
            cEid,
            addressToBytes32(userC),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory feeC = aOFT.quoteSend(sendParamToEndpointC, false);

        // User A call send within the allowed outbound window and limit.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: feeC.nativeFee }(sendParamToEndpointC, feeC, payable(address(this)));
        vm.stopPrank();

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend);

        SendParam memory sendParamToEndpointB = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory feeB = aOFT.quoteSend(sendParamToEndpointB, false);

        // User A call send within the allowed outbound window and limit.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        vm.expectRevert(DoubleSidedRateLimiter.RateLimitExceeded.selector);
        aOFT.send{ value: feeB.nativeFee }(sendParamToEndpointB, feeB, payable(address(this)));
        vm.stopPrank();
    }

    function test_only_owner_can_set_rates() public {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));

        // The outbound (send) rate limits for OFT A.
        DoubleSidedRateLimiter.RateLimitConfig[] memory aNewOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aNewOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 1.9 ether, window: 59 seconds});

        vm.prank(userB);

        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, userB)
        );
        aOFT.setRateLimits(aNewOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);
    }

    function test_send_oft() public {
        uint256 tokensToSend = 1 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();

        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend);
    }

    function test_send_oft_fails_outside_outbound_limit() public {
        uint256 tokensToSend = 10 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.expectRevert(DoubleSidedRateLimiter.RateLimitExceeded.selector);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();
    }

    function test_send_oft_succeeds_after_waiting_limit() public {
        uint256 tokensToSend = 10 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        // User A call send first time
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();

        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend);

        uint256 tokensToSendAfter = 1 ether;
        SendParam memory nextSendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSendAfter,
            tokensToSendAfter,
            options,
            "",
            ""
        );
        MessagingFee memory nextFee = aOFT.quoteSend(nextSendParam, false);

        // User A waits 61 seconds and calls send a second time
        skip(61 seconds);
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSendAfter);
        aOFT.send{ value: nextFee.nativeFee }(nextSendParam, nextFee, payable(address(this)));
        vm.stopPrank();

        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend - tokensToSendAfter);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend + tokensToSendAfter);
    }

    function test_receive_oft_fails_outside_inbound_limit() public {
        uint256 tokensToSend = 10 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        // User A call send two times within the allowed outbound window.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        skip(61 seconds);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();

        // Packet 1 is executed.
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));

        // Packet 2 fails and must wait at least 60 seconds.
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0), abi.encodePacked(DoubleSidedRateLimiter.RateLimitExceeded.selector), "");
    }

    function test_receive_oft_succeeds_after_waiting_limit() public {

        uint256 tokensToSend = 10 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );

        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        // User A calls send twice.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        skip(61 seconds);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();

        // Packet 1 is executed.
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));

        // Packet 2 waits at least 60 seconds and is executed.
        skip(61 seconds);
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend * 2);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend * 2);
    }

    function test_receive_oft_succeeds_with_amount_allowed_after_decay() public {
        uint256 tokensToSend = 10 ether;
        uint256 tokensToSendAfterDecay = 5 ether;

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );

        SendParam memory sendParamAfterDecay = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSendAfterDecay,
            tokensToSendAfterDecay,
            options,
            "",
            ""
        );

        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);
        MessagingFee memory feeAfterDecay = aOFT.quoteSend(sendParamAfterDecay, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        // User A calls send twice.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        skip(61 seconds);
        aToken.approve(address(aOFT), tokensToSendAfterDecay);
        aOFT.send{ value: fee.nativeFee }(sendParamAfterDecay, feeAfterDecay, payable(address(this)));
        vm.stopPrank();

        // Packet 1 is executed.
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));

        // Packet 2 waits at least 30 seconds.
        // Because the decay is 60 seconds, with a limit of 10 tokens, 5 tokens should be free to send after 30 seconds of decay.
        skip(30 seconds);
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend - tokensToSendAfterDecay);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend + tokensToSendAfterDecay);
    }

    function test_receive_oft_fails_with_amount_greater_than_decay() public {
        uint256 tokensToSend = 10 ether;
        uint256 tokensToSendAfterDecay = 5.1 ether;

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );

        SendParam memory sendParamAfterDecay = SendParam(
            bEid,
            addressToBytes32(userB),
            tokensToSendAfterDecay,
            tokensToSendAfterDecay,
            options,
            "",
            ""
        );

        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);
        MessagingFee memory feeAfterDecay = aOFT.quoteSend(sendParamAfterDecay, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(userB), initialBalance);

        // User A calls send twice.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        skip(61 seconds);
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));
        aToken.approve(address(aOFT), tokensToSendAfterDecay);
        aOFT.send{ value: fee.nativeFee }(sendParamAfterDecay, feeAfterDecay, payable(address(this)));
        vm.stopPrank();
        // Packet 2 waits at least 30 seconds.
        // Because the decay is 60 seconds, with a limit of 10 tokens, only 5 tokens should be free to send after 30 seconds of decay.
        skip(30 seconds);
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0), abi.encodePacked(DoubleSidedRateLimiter.RateLimitExceeded.selector), "");

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend - tokensToSendAfterDecay);
        assertEq(bToken.balanceOf(userB), initialBalance + tokensToSend);
    }

    function test_send_oft_compose_msg() public {
        uint256 tokensToSend = 1 ether;

        OFTComposerMock composer = new OFTComposerMock();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        bytes memory composeMsg = hex"1234";
        SendParam memory sendParam = SendParam(
            bEid,
            addressToBytes32(address(composer)),
            tokensToSend,
            tokensToSend,
            options,
            composeMsg,
            ""
        );
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aToken.balanceOf(userA), initialBalance);
        assertEq(bToken.balanceOf(address(composer)), 0);

        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aOFT.send{ value: fee.nativeFee }(
            sendParam,
            fee,
            payable(address(this))
        );
        vm.stopPrank();

        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)));

        // lzCompose params
        uint32 dstEid_ = bEid;
        address from_ = address(bOFT);
        bytes memory options_ = options;
        bytes32 guid_ = msgReceipt.guid;
        address to_ = address(composer);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            aEid,
            oftReceipt.amountReceivedLD,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );
        this.lzCompose(dstEid_, from_, options_, guid_, to_, composerMsg_);

        assertEq(aToken.balanceOf(userA), initialBalance - tokensToSend);
        assertEq(bToken.balanceOf(address(composer)), tokensToSend);

        assertEq(composer.from(), from_);
        assertEq(composer.guid(), guid_);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    function _createSendParam(uint256 _tokensToSend, uint32 _dstEid, address _to) internal pure returns (SendParam memory) {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200_000, 0);
        return SendParam(
            _dstEid,
            addressToBytes32(_to),
            _tokensToSend,
            _tokensToSend * 9_000 / 10_000,
            options,
            "",
            ""
        );
    }

    function test_net_rate_limiting() public {
        // 1. Set the ORL on aEid to bEid to 20 eth/min.  The inbound rate limit on bEid from
        // aEid remains the same (10 eth/min).
        DoubleSidedRateLimiter.RateLimitConfig[] memory aOutboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aOutboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 20 ether, window: 60 seconds});
        aOFT.setRateLimits(aOutboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Outbound);
        DoubleSidedRateLimiter.RateLimitConfig[] memory aInboundConfigs = new DoubleSidedRateLimiter.RateLimitConfig[](1);
        aInboundConfigs[0] = DoubleSidedRateLimiter.RateLimitConfig({eid: bEid, limit: 20 ether, window: 60 seconds});
        aOFT.setRateLimits(aInboundConfigs, DoubleSidedRateLimiter.RateLimitDirection.Inbound);
        uint256 amountCanBeSent;
        uint256 amountCanBeReceived;

        // 2. tokensToSend is meant to exhaust bEid's IRL from aEid.
        uint256 tokensToSend = 10 ether;
        SendParam memory aToBSendParam = _createSendParam(tokensToSend, bEid, userB);
        MessagingFee memory fee = aOFT.quoteSend(aToBSendParam, false);

        // 3. userA exhausts the IRL of bEid from aEid.
        (, amountCanBeSent) = aOFT.getAmountCanBeSent(bEid);
        assertEq(amountCanBeSent, 20 ether);
        (, amountCanBeReceived) = bOFT.getAmountCanBeReceived(aEid);
        assertEq(amountCanBeReceived, 10 ether);

        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(aToBSendParam, fee, payable(address(this)));
        vm.stopPrank();

        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0));

        (, amountCanBeSent) = aOFT.getAmountCanBeSent(bEid);
        assertEq(amountCanBeSent, 10 ether);
        (, amountCanBeReceived) = bOFT.getAmountCanBeReceived(aEid);
        assertEq(amountCanBeReceived, 0);

        // 4. Assert bEid IRL from aEID is exhausted.
        (uint256 amountInFlight, uint128 lastUpdated, uint256 limit, uint48 window) = bOFT.inboundRateLimits(aEid);
        assertEq(amountInFlight, tokensToSend);
        assertEq(lastUpdated, block.timestamp);
        assertEq(limit, 10 ether);
        assertEq(window, 60 seconds);

        // 5. Send 10 ether from aEid to bEid again.  This should not fail because ORL of aEID to bEid is 20 ether.
        vm.startPrank(userA);
        aToken.approve(address(aOFT), tokensToSend);
        aOFT.send{ value: fee.nativeFee }(aToBSendParam, fee, payable(address(this)));
        vm.stopPrank();

        (, amountCanBeSent) = aOFT.getAmountCanBeSent(bEid);
        assertEq(amountCanBeSent, 0);
        (, amountCanBeReceived) = bOFT.getAmountCanBeReceived(aEid);
        assertEq(amountCanBeReceived, 0); // should not have changed

        // 6. Expect the packet delivery to revert, as the IRL is exhausted.  This packet is now in flight until the IRL
        // allows another 10 ether to be received.
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)), 1, address(0), abi.encodePacked(DoubleSidedRateLimiter.RateLimitExceeded.selector), "");

        // 7. userB sends back the 10 ether to userA on aEid, resetting the amountCanBeReceived on bEid from aEID to 10
        // ether.  The packet from #6 can now be delivered without violating the IRL.
        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 10 ether);
        SendParam memory bToASendParam = _createSendParam(tokensToSend, aEid, userA);

        vm.startPrank(userB);
        bToken.approve(address(bOFT), tokensToSend);
        bOFT.send{ value: fee.nativeFee }(bToASendParam, fee, payable(address(this)));
        vm.stopPrank();

        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 0);
        (, amountCanBeReceived) = aOFT.getAmountCanBeReceived(bEid);
        assertEq(amountCanBeReceived, 20 ether);
        verifyAndExecutePackets(aEid, addressToBytes32(address(aOFT)), 1, address(0));
        (, amountCanBeReceived) = aOFT.getAmountCanBeReceived(bEid);
        assertEq(amountCanBeReceived, 10 ether);
        (amountInFlight, lastUpdated, limit, window) = bOFT.inboundRateLimits(aEid);
        assertEq(amountInFlight, 0);
        assertEq(lastUpdated, block.timestamp);
        assertEq(limit, 10 ether);
        assertEq(window, 60 seconds);

        // 8. try to send 10 ether from bEid to aEid again, violating the ORL.
        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 0);
        (, amountCanBeReceived) = aOFT.getAmountCanBeReceived(bEid);
        assertEq(amountCanBeReceived, 10 ether);

        vm.startPrank(userB);
        bToken.approve(address(bOFT), tokensToSend);
        vm.expectRevert(DoubleSidedRateLimiter.RateLimitExceeded.selector);
        bOFT.send{ value: fee.nativeFee }(bToASendParam, fee, payable(address(this)));
        vm.stopPrank();

        // 9. The packet from #6 can be delivered through a permission-less retry without violating the IRL.
        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 0);
        (, amountCanBeReceived) = bOFT.getAmountCanBeReceived(aEid);
        assertEq(amountCanBeReceived, 10 ether);
        verifyAndExecutePackets(bEid, addressToBytes32(address(bOFT)));
        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 10 ether);
        (, amountCanBeReceived) = bOFT.getAmountCanBeReceived(aEid);
        assertEq(amountCanBeReceived, 0);

        // 10. Similar to #8, send 10 ether from bEid to aEid again, but this time successfully as the ORL has reset.
        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 10 ether);

        vm.startPrank(userB);
        bToken.approve(address(bOFT), tokensToSend);
        bOFT.send{ value: fee.nativeFee }(bToASendParam, fee, payable(address(this)));
        vm.stopPrank();

        (, amountCanBeSent) = bOFT.getAmountCanBeSent(aEid);
        assertEq(amountCanBeSent, 0);
    }
}