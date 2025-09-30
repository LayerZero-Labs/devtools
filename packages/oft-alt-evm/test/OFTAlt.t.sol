// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { OFTAltMock } from "./mocks/OFTAltMock.sol";
import { OFTAdapterAltMock } from "./mocks/OFTAdapterAltMock.sol";

import { MessagingFee, MessagingReceipt, OFTAltCore } from "../contracts/OFTAltCore.sol";
import { ERC20Mock } from "@layerzerolabs/oft-evm/test/mocks/ERC20Mock.sol";

import { OFTComposerMock } from "@layerzerolabs/oft-evm/test/mocks/OFTComposerMock.sol";
import { OFTInspectorMock, IOAppMsgInspector } from "@layerzerolabs/oft-evm/test/mocks/OFTInspectorMock.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

// TODO: Change this import to @layerzerolabs/oapp-alt-evm once the package is published
import { OAppSenderAlt } from "@layerzerolabs/oapp-alt-evm/contracts/oapp/OAppSenderAlt.sol";

import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { OFTAlt } from "../contracts/OFTAlt.sol";
import { OFTAdapterAlt } from "../contracts/OFTAdapterAlt.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { OFTAltMockCodec } from "./lib/OFTAltMockCodec.sol";
import { OFTAdapterAltMockCodec } from "./lib/OFTAdapterAltMockCodec.sol";

import { console } from "forge-std/console.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
contract OFTAltTest is TestHelperOz5 {
    using OptionsBuilder for bytes;
    using OFTAltMockCodec for OFTAlt;
    using OFTAdapterAltMockCodec for OFTAdapterAlt;

    uint32 internal constant A_EID = 1;
    ERC20Mock nativeTokenMock_A = new ERC20Mock("NativeAltTokens_A", "NAT_A");

    uint32 internal constant B_EID = 2;
    ERC20Mock nativeTokenMock_B = new ERC20Mock("NativeAltTokens_B", "NAT_B");

    uint32 internal constant C_EID = 3;
    ERC20Mock nativeTokenMock_C = new ERC20Mock("NativeAltTokens_C", "NAT_C");

    uint32 internal constant D_EID = 4;
    ERC20Mock nativeTokenMock_D = new ERC20Mock("NativeAltTokens_D", "NAT_D");

    string internal constant A_OFT_NAME = "aOFT";
    string internal constant A_OFT_SYMBOL = "aOFT";
    string internal constant B_OFT_NAME = "bOFT";
    string internal constant B_OFT_SYMBOL = "bOFT";
    string internal constant C_TOKEN_NAME = "cToken";
    string internal constant C_TOKEN_SYMBOL = "cToken";

    address[] public altToken;

    OFTAlt internal aOFT;
    OFTAlt internal bOFT;
    OFTAdapterAlt internal cOFTAdapter;
    ERC20Mock internal cERC20Mock;

    OFTInspectorMock internal oAppInspector;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");
    address public userC = makeAddr("userC");
    address public userD = makeAddr("userD");
    uint256 public initialBalance = 100 ether;
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        _deal();

        super.setUp();
        altToken.push(address(nativeTokenMock_A));
        altToken.push(address(nativeTokenMock_B));
        altToken.push(address(nativeTokenMock_C));
        altToken.push(address(nativeTokenMock_D));

        createEndpoints(4, LibraryType.SimpleMessageLib, altToken);

        aOFT = OFTAltMock(
            _deployOApp(
                type(OFTAltMock).creationCode,
                abi.encode(A_OFT_NAME, A_OFT_SYMBOL, address(endpoints[A_EID]), address(this))
            )
        );

        bOFT = OFTAltMock(
            _deployOApp(
                type(OFTAltMock).creationCode,
                abi.encode(B_OFT_NAME, B_OFT_SYMBOL, address(endpoints[B_EID]), address(this))
            )
        );

        cERC20Mock = new ERC20Mock(C_TOKEN_NAME, C_TOKEN_SYMBOL);
        cOFTAdapter = OFTAdapterAltMock(
            _deployOApp(
                type(OFTAdapterAltMock).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[C_EID]), address(this))
            )
        );

        // config and wire the ofts
        address[] memory ofts = new address[](3);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFTAdapter);
        this.wireOApps(ofts);

        // mint tokens
        aOFT.asOFTAltMock().mint(userA, initialBalance);
        bOFT.asOFTAltMock().mint(userB, initialBalance);
        cERC20Mock.mint(userC, initialBalance);

        // deploy a universal inspector, can be used by each oft
        oAppInspector = new OFTInspectorMock();
    }

    function _deal() internal {
        vm.deal(userA, initialNativeBalance);
        vm.deal(userB, initialNativeBalance);
        vm.deal(userC, initialNativeBalance);
        vm.deal(userD, initialNativeBalance);
    }

    function test_constructor() public view {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));
        assertEq(cOFTAdapter.owner(), address(this));

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);
        assertEq(IERC20(cOFTAdapter.token()).balanceOf(userC), initialBalance);

        assertEq(aOFT.token(), address(aOFT));
        assertEq(bOFT.token(), address(bOFT));
        assertEq(cOFTAdapter.token(), address(cERC20Mock));
    }

    function test_oftVersion() public view {
        (bytes4 interfaceId, ) = aOFT.oftVersion();
        bytes4 expectedId = 0x02e49c2c;
        assertEq(interfaceId, expectedId);
    }

    function test_send_oft(uint256 tokensToSend) public virtual {
        vm.assume(tokensToSend > 0.001 ether && tokensToSend < 100 ether); // avoid reverting due to SlippageExceeded

        uint256 preETHBalance_userA = userA.balance;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(userB),
            tokensToSend,
            (tokensToSend * 9_500) / 10_000, // allow 1% slippage
            options,
            "",
            ""
        );

        MessagingFee memory quoteFee = aOFT.quoteSend(sendParam, false);

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);

        if (aOFT.asOFTAltMock().approvalRequired()) {
            vm.prank(userA);
            aOFT.asIERC20().approve(address(aOFT), tokensToSend);
        }

        vm.startPrank(userA);
        nativeTokenMock_A.mint(userA, quoteFee.nativeFee);
        IERC20(nativeTokenMock_A).approve(address(aOFT), quoteFee.nativeFee);

        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aOFT.send(
            sendParam,
            quoteFee,
            payable(address(this))
        );
        vm.stopPrank();

        verifyPackets(B_EID, addressToBytes32(address(bOFT)));
        uint256 postETHBalance_userA = userA.balance;

        assertEq(preETHBalance_userA, postETHBalance_userA);
        assertEq(msgReceipt.fee.nativeFee, quoteFee.nativeFee);
        assertEq(aOFT.balanceOf(userA), initialBalance - oftReceipt.amountSentLD);
        assertEq(bOFT.balanceOf(userB), initialBalance + oftReceipt.amountReceivedLD);
    }

    function test_revert_msg_value_not_zero() public {
        uint256 msgValue = 1 ether;
        vm.expectRevert(abi.encodeWithSelector(OFTAltCore.OFTAltCore__msg_value_not_zero.selector, msgValue));
        aOFT.send{ value: msgValue }(
            SendParam(B_EID, addressToBytes32(userB), 1 ether, 1 ether, "", "", ""),
            MessagingFee(0, 0),
            payable(address(this))
        );
    }

    function test_send_oft_compose_msg(uint256 tokensToSend) public virtual {
        vm.assume(tokensToSend > 0.001 ether && tokensToSend < 100 ether); // avoid reverting due to SlippageExceeded

        OFTComposerMock composer = new OFTComposerMock();

        bytes memory options = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorLzComposeOption(0, 500000, 0);
        bytes memory composeMsg = hex"1234";
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(address(composer)),
            tokensToSend,
            (tokensToSend * 9_500) / 10_000, // allow 1% slippage
            options,
            composeMsg,
            ""
        );
        MessagingFee memory quoteFee = aOFT.quoteSend(sendParam, false);

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(address(composer)), 0);

        if (aOFT.asOFTAltMock().approvalRequired()) {
            vm.prank(userA);
            aOFT.asIERC20().approve(address(aOFT), tokensToSend);
        }

        vm.startPrank(userA);
        nativeTokenMock_A.mint(userA, quoteFee.nativeFee);
        IERC20(nativeTokenMock_A).approve(address(aOFT), quoteFee.nativeFee);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aOFT.send(
            sendParam,
            quoteFee,
            payable(address(this))
        );
        verifyPackets(B_EID, addressToBytes32(address(bOFT)));

        // lzCompose params
        uint32 dstEid_ = B_EID;
        address from_ = address(bOFT);
        bytes memory options_ = options;
        bytes32 guid_ = msgReceipt.guid;
        address to_ = address(composer);
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            A_EID,
            oftReceipt.amountReceivedLD,
            abi.encodePacked(addressToBytes32(userA), composeMsg)
        );
        this.lzCompose(dstEid_, from_, options_, guid_, to_, composerMsg_);

        assertEq(aOFT.balanceOf(userA), initialBalance - oftReceipt.amountSentLD);
        assertEq(bOFT.balanceOf(address(composer)), oftReceipt.amountReceivedLD);

        assertEq(composer.from(), from_);
        assertEq(composer.guid(), guid_);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    function test_oft_compose_codec(
        uint64 nonce,
        uint32 srcEid,
        uint256 amountCreditLD,
        bytes memory composeMsg
    ) public view {
        bytes memory message = OFTComposeMsgCodec.encode(
            nonce,
            srcEid,
            amountCreditLD,
            abi.encodePacked(addressToBytes32(msg.sender), composeMsg)
        );
        (uint64 nonce_, uint32 srcEid_, uint256 amountCreditLD_, bytes32 composeFrom_, bytes memory composeMsg_) = this
            .decodeOFTComposeMsgCodec(message);

        assertEq(nonce_, nonce);
        assertEq(srcEid_, srcEid);
        assertEq(amountCreditLD_, amountCreditLD);
        assertEq(composeFrom_, addressToBytes32(msg.sender));
        assertEq(composeMsg_, composeMsg);
    }

    function decodeOFTComposeMsgCodec(
        bytes calldata message
    )
        public
        pure
        returns (uint64 nonce, uint32 srcEid, uint256 amountCreditLD, bytes32 composeFrom, bytes memory composeMsg)
    {
        nonce = OFTComposeMsgCodec.nonce(message);
        srcEid = OFTComposeMsgCodec.srcEid(message);
        amountCreditLD = OFTComposeMsgCodec.amountLD(message);
        composeFrom = OFTComposeMsgCodec.composeFrom(message);
        composeMsg = OFTComposeMsgCodec.composeMsg(message);
    }

    function test_debit_slippage_removeDust() public virtual {
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = 1.23456789 ether;
        uint32 dstEid = A_EID;

        // remove the dust form the shared decimal conversion
        assertEq(aOFT.asOFTAltMock().removeDust(amountToSendLD), 1.234567 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                aOFT.asOFTAltMock().removeDust(amountToSendLD),
                minAmountToCreditLD
            )
        );
        aOFT.asOFTAltMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_debit_slippage_minAmountToCreditLD() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1.00000001 ether;
        uint32 dstEid = A_EID;

        vm.expectRevert(abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD));
        aOFT.asOFTAltMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_toLD(uint64 amountSD) public view {
        assertEq(
            amountSD * OFTAltMock(address(aOFT)).decimalConversionRate(),
            aOFT.asOFTAltMock().toLD(uint64(amountSD))
        );
    }

    function test_toSD(uint256 amountLD) public view {
        vm.assume(amountLD <= type(uint64).max); // avoid reverting due to overflow
        assertEq(amountLD / aOFT.asOFTAltMock().decimalConversionRate(), aOFT.asOFTAltMock().toSD(amountLD));
    }

    function test_oft_debit() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = A_EID;

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(aOFT.balanceOf(address(this)), 0);

        vm.prank(userA);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = aOFT.asOFTAltMock().debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);

        assertEq(aOFT.balanceOf(userA), initialBalance - amountToSendLD);
        assertEq(aOFT.balanceOf(address(this)), 0);
    }

    function test_oft_credit() public {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = A_EID;

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(aOFT.balanceOf(address(this)), 0);

        vm.prank(userA);
        uint256 amountReceived = aOFT.asOFTAltMock().credit(userA, amountToCreditLD, srcEid);

        assertEq(aOFT.balanceOf(userA), initialBalance + amountReceived);
        assertEq(aOFT.balanceOf(address(this)), 0);
    }

    function test_oft_adapter_debit() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = C_EID;

        assertEq(cERC20Mock.balanceOf(userC), initialBalance);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), 0);

        vm.prank(userC);
        vm.expectRevert(
            abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD + 1)
        );
        cOFTAdapter.asOFTAdapterAltMock().debitView(amountToSendLD, minAmountToCreditLD + 1, dstEid);

        vm.prank(userC);
        cERC20Mock.approve(address(cOFTAdapter), amountToSendLD);
        vm.prank(userC);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = cOFTAdapter.asOFTAdapterAltMock().debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);

        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountToSendLD);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), amountToSendLD);
    }

    function test_oft_adapter_credit() public {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = C_EID;

        assertEq(cERC20Mock.balanceOf(userC), initialBalance);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), 0);

        vm.prank(userC);
        cERC20Mock.transfer(address(cOFTAdapter), amountToCreditLD);

        uint256 amountReceived = cOFTAdapter.asOFTAdapterAltMock().credit(userB, amountToCreditLD, srcEid);

        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountToCreditLD);
        assertEq(cERC20Mock.balanceOf(address(userB)), amountReceived);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), 0);
    }

    function decodeOFTMsgCodec(
        bytes calldata message
    ) public pure returns (bool isComposed, bytes32 sendTo, uint64 amountSD, bytes memory composeMsg) {
        isComposed = OFTMsgCodec.isComposed(message);
        sendTo = OFTMsgCodec.sendTo(message);
        amountSD = OFTMsgCodec.amountSD(message);
        composeMsg = OFTMsgCodec.composeMsg(message);
    }

    function test_oft_build_msg(
        uint32 dstEid,
        bytes32 to,
        uint256 amountToSendLD,
        bytes memory composeMsg
    ) public view {
        vm.assume(composeMsg.length > 0); // ensure there is a composed payload
        uint256 minAmountToCreditLD = aOFT.asOFTAltMock().removeDust(amountToSendLD);

        // params for buildMsgAndOptions
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            dstEid,
            to,
            amountToSendLD,
            minAmountToCreditLD,
            extraOptions,
            composeMsg,
            ""
        );
        uint256 amountToCreditLD = minAmountToCreditLD;

        (bytes memory message, ) = aOFT.asOFTAltMock().buildMsgAndOptions(sendParam, amountToCreditLD);

        (bool isComposed_, bytes32 sendTo_, uint64 amountSD_, bytes memory composeMsg_) = this.decodeOFTMsgCodec(
            message
        );

        assertEq(isComposed_, true);
        assertEq(sendTo_, to);
        assertEq(amountSD_, aOFT.asOFTAltMock().toSD(amountToCreditLD));
        bytes memory expectedComposeMsg = abi.encodePacked(addressToBytes32(address(this)), composeMsg);
        assertEq(composeMsg_, expectedComposeMsg);
    }

    function test_oft_build_msg_no_compose_msg(uint32 dstEid, bytes32 to, uint256 amountToSendLD) public view {
        uint256 minAmountToCreditLD = aOFT.asOFTAltMock().removeDust(amountToSendLD);

        // params for buildMsgAndOptions
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory composeMsg = "";
        SendParam memory sendParam = SendParam(
            dstEid,
            to,
            amountToSendLD,
            minAmountToCreditLD,
            extraOptions,
            composeMsg,
            ""
        );
        uint256 amountToCreditLD = minAmountToCreditLD;

        (bytes memory message, ) = aOFT.asOFTAltMock().buildMsgAndOptions(sendParam, amountToCreditLD);

        (bool isComposed_, bytes32 sendTo_, uint64 amountSD_, bytes memory composeMsg_) = this.decodeOFTMsgCodec(
            message
        );

        assertEq(isComposed_, false);
        assertEq(sendTo_, to);
        assertEq(amountSD_, aOFT.asOFTAltMock().toSD(amountToCreditLD));
        assertEq(composeMsg_, "");
    }

    function test_set_enforced_options() public {
        uint32 eid = 1;

        bytes memory optionsTypeOne = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory optionsTypeTwo = OptionsBuilder.newOptions().addExecutorLzReceiveOption(250000, 0);

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](2);
        enforcedOptions[0] = EnforcedOptionParam(eid, 1, optionsTypeOne);
        enforcedOptions[1] = EnforcedOptionParam(eid, 2, optionsTypeTwo);

        aOFT.setEnforcedOptions(enforcedOptions);

        assertEq(aOFT.enforcedOptions(eid, 1), optionsTypeOne);
        assertEq(aOFT.enforcedOptions(eid, 2), optionsTypeTwo);
    }

    function test_assert_options_type3_revert() public {
        uint32 eid = 1;
        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0004"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0004"));
        aOFT.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0002"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0002"));
        aOFT.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0001"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0001"));
        aOFT.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0003"); // IS type 3
        aOFT.setEnforcedOptions(enforcedOptions); // doesnt revert cus option type 3
    }

    function test_combine_options(uint32 eid, uint128 nativeDropGas, address user) public {
        uint16 msgType = 1;

        bytes memory enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        EnforcedOptionParam[] memory enforcedOptionsArray = new EnforcedOptionParam[](1);
        enforcedOptionsArray[0] = EnforcedOptionParam(eid, msgType, enforcedOptions);
        aOFT.setEnforcedOptions(enforcedOptionsArray);

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            nativeDropGas,
            addressToBytes32(user)
        );

        bytes memory expectedOptions = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorNativeDropOption(nativeDropGas, addressToBytes32(user));

        bytes memory combinedOptions = aOFT.combineOptions(eid, msgType, extraOptions);
        assertEq(combinedOptions, expectedOptions);
    }

    function test_combine_options_no_extra_options(uint32 eid, uint128 gasLimit, uint128 nativeDrop) public {
        uint16 msgType = 1;

        bytes memory enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(gasLimit, nativeDrop);
        EnforcedOptionParam[] memory enforcedOptionsArray = new EnforcedOptionParam[](1);
        enforcedOptionsArray[0] = EnforcedOptionParam(eid, msgType, enforcedOptions);
        aOFT.setEnforcedOptions(enforcedOptionsArray);

        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(gasLimit, nativeDrop);

        bytes memory combinedOptions = aOFT.combineOptions(eid, msgType, "");
        assertEq(combinedOptions, expectedOptions);
    }

    function test_combine_options_no_enforced_options(
        uint32 eid,
        uint16 msgType,
        uint128 nativeDropGas,
        address user
    ) public view {
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            nativeDropGas,
            addressToBytes32(user)
        );

        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            nativeDropGas,
            addressToBytes32(user)
        );

        bytes memory combinedOptions = aOFT.combineOptions(eid, msgType, extraOptions);
        assertEq(combinedOptions, expectedOptions);
    }

    function test_oapp_inspector_inspect(uint32 dstEid, address user, uint256 amountToSendLD) public {
        bytes32 to = addressToBytes32(user);
        uint256 minAmountToCreditLD = aOFT.asOFTAltMock().removeDust(amountToSendLD);

        // params for buildMsgAndOptions
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory composeMsg = "";
        SendParam memory sendParam = SendParam(
            dstEid,
            to,
            amountToSendLD,
            minAmountToCreditLD,
            extraOptions,
            composeMsg,
            ""
        );
        uint256 amountToCreditLD = minAmountToCreditLD;

        // doesnt revert
        (bytes memory message, ) = aOFT.asOFTAltMock().buildMsgAndOptions(sendParam, amountToCreditLD);

        // deploy a universal inspector, it automatically reverts
        oAppInspector = new OFTInspectorMock();
        // set the inspector
        aOFT.setMsgInspector(address(oAppInspector));

        // does revert because inspector is set
        vm.expectRevert(abi.encodeWithSelector(IOAppMsgInspector.InspectionFailed.selector, message, extraOptions));
        (message, ) = aOFT.asOFTAltMock().buildMsgAndOptions(sendParam, amountToCreditLD);
    }
}
