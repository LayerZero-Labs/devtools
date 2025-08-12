// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { OFTUpgradeableMock } from "./mocks/OFTUpgradeableMock.sol";
import { MessagingFee, MessagingReceipt } from "../contracts/oft/OFTCoreUpgradeable.sol";
import { OFTAdapterUpgradeableMock } from "./mocks/OFTAdapterUpgradeableMock.sol";
import { NativeOFTAdapterUpgradeableMock } from "./mocks/NativeOFTAdapterUpgradeableMock.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { OFTComposerMock } from "./mocks/OFTComposerMock.sol";
import { OFTInspectorMock, IOAppMsgInspector } from "./mocks/OFTInspectorMock.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/libs/OAppOptionsType3Upgradeable.sol";

import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOFT, SendParam, OFTReceipt } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { NativeOFTAdapterUpgradeable } from "../contracts/oft/NativeOFTAdapterUpgradeable.sol";

import "forge-std/console.sol";
import { OFTTest } from "./OFT.t.sol";



contract NativeOFTAdapterUpgradeableTest is OFTTest {
    using OptionsBuilder for bytes;
    uint32 dEid = 1;

    NativeOFTAdapterUpgradeableMock dNativeOFTAdapter;

    address public userD = address(0x4);
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        vm.deal(userB, initialBalance);
        vm.deal(userD, initialNativeBalance);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        dNativeOFTAdapter = NativeOFTAdapterUpgradeableMock(
            _deployContractAndProxy(
                type(NativeOFTAdapterUpgradeableMock).creationCode,
                abi.encode(18, address(endpoints[dEid])),
                abi.encodeWithSelector(NativeOFTAdapterUpgradeableMock.initialize.selector, address(this))
            )
        );

        bOFT = OFTUpgradeableMock(
            _deployContractAndProxy(
                type(OFTUpgradeableMock).creationCode,
                abi.encode(address(endpoints[bEid])),
                abi.encodeWithSelector(OFTUpgradeableMock.initialize.selector, "bOFT", "bOFT", address(this))
            )
        );

        // config and wire the ofts
        address[] memory ofts = new address[](2);
        ofts[0] = address(dNativeOFTAdapter);
        ofts[1] = address(bOFT);
        this.wireOApps(ofts);

        // mint tokens
        bOFT.mint(userB, initialBalance);

        // deploy a universal inspector, can be used by each oft
        oAppInspector = new OFTInspectorMock();
    }

    function test_constructor() public view virtual override {
        assertEq(dNativeOFTAdapter.owner(), address(this));
        assertEq(dNativeOFTAdapter.token(), address(0));
        assertEq(dNativeOFTAdapter.approvalRequired(), false);
    }

    function test_oft_debit() public virtual override {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = dEid;
        
        vm.prank(userD);
        vm.expectRevert(
            abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD + 1)
        );
        dNativeOFTAdapter.debit(amountToSendLD, minAmountToCreditLD + 1, dstEid);

        vm.prank(userD);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = dNativeOFTAdapter.debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);
    }

    function test_oft_credit() public virtual override {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = dEid;

        // simulate userD already having deposited native to the adapter
        vm.deal(address(dNativeOFTAdapter), amountToCreditLD);

        uint256 amountReceived = dNativeOFTAdapter.credit(userD, amountToCreditLD, srcEid);

        assertEq(userD.balance, initialNativeBalance + amountReceived);
        assertEq(address(dNativeOFTAdapter).balance, 0);
    }

    function test_send_oft() public virtual override {
        assertEq(userD.balance, initialNativeBalance);
        assertEq(address(dNativeOFTAdapter).balance, 0);

        uint256 amountToSendLD = 1 ether;
        uint32 dstEid = bEid;

        SendParam memory sendParam = SendParam(
            dstEid,
            addressToBytes32(userB),
            amountToSendLD,
            amountToSendLD,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0),
            "",
            ""
        );

        MessagingFee memory fee = dNativeOFTAdapter.quoteSend(sendParam, false);
        uint256 correctMsgValue = fee.nativeFee + sendParam.amountLD;

        // expect sending wrapped native to fail if the amount to be sent is not provided in msg.value
        vm.prank(userD);
        vm.expectRevert(
            abi.encodeWithSelector(NativeOFTAdapterUpgradeable.IncorrectMessageValue.selector, fee.nativeFee, correctMsgValue)
        );
        dNativeOFTAdapter.send{ value: fee.nativeFee }(sendParam, fee, userD);

        // expect sending wrapped native to succeed if the amount to be sent and the fee are both included in msg.value
        vm.prank(userD);
        dNativeOFTAdapter.send{ value: correctMsgValue }(sendParam, fee, userD);

        assertEq(userD.balance, initialNativeBalance - correctMsgValue);
        assertEq(address(dNativeOFTAdapter).balance, amountToSendLD);

        // expect sending wrapped native to fail if extra msg.value is provided
        // i.e msg.value > amount to be sent (with dust removed) + fee
        uint256 extraMsgValue = correctMsgValue + 1;
        vm.prank(userD);
        vm.expectRevert(
            abi.encodeWithSelector(NativeOFTAdapterUpgradeable.IncorrectMessageValue.selector, extraMsgValue, correctMsgValue)
        );
        dNativeOFTAdapter.send{ value: extraMsgValue }(sendParam, fee, userD);
    }

    function test_send_oft_compose_msg() public virtual override {
        uint256 tokensToSend = 1 ether;

        vm.deal(userD, initialNativeBalance);

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
        MessagingFee memory fee = dNativeOFTAdapter.quoteSend(sendParam, false);

        assertEq(userD.balance, initialNativeBalance);
        assertEq(bOFT.balanceOf(address(composer)), 0);

        vm.prank(userD);
        uint256 correctMsgValue = fee.nativeFee + sendParam.amountLD;
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = dNativeOFTAdapter.send{ value: correctMsgValue }(
            sendParam,
            fee,
            payable(address(this))
        );
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        // lzCompose params - reduce local variables to fix stack too deep
        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            dEid,
            oftReceipt.amountReceivedLD,
            abi.encodePacked(addressToBytes32(userD), composeMsg)
        );
        this.lzCompose(bEid, address(bOFT), options, msgReceipt.guid, address(composer), composerMsg_);

        assertEq(userD.balance, initialNativeBalance - tokensToSend - fee.nativeFee);
        assertEq(bOFT.balanceOf(address(composer)), tokensToSend);

        assertEq(composer.from(), address(bOFT));
        assertEq(composer.guid(), msgReceipt.guid);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    function test_debit_slippage_removeDust() public virtual override {
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = 1.23456789 ether;
        uint32 dstEid = dEid;

        // remove the dust form the shared decimal conversion
        assertEq(dNativeOFTAdapter.removeDust(amountToSendLD), 1.234567 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                dNativeOFTAdapter.removeDust(amountToSendLD),
                minAmountToCreditLD
            )
        );
        dNativeOFTAdapter.debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_debit_slippage_minAmountToCreditLD() public virtual override {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1.00000001 ether;
        uint32 dstEid = dEid;

        vm.expectRevert(abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD));
        dNativeOFTAdapter.debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_oft_build_msg() public view virtual override {
        uint32 dstEid = bEid;
        bytes32 to = addressToBytes32(userD);
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = dNativeOFTAdapter.removeDust(amountToSendLD);

        // params for buildMsgAndOptions
        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory composeMsg = hex"1234";
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

        (bytes memory message, ) = dNativeOFTAdapter.buildMsgAndOptions(sendParam, amountToCreditLD);

        (bool isComposed_, bytes32 sendTo_, uint64 amountSD_, bytes memory composeMsg_) = this.decodeOFTMsgCodec(
            message
        );

        assertEq(isComposed_, true);
        assertEq(sendTo_, to);
        assertEq(amountSD_, dNativeOFTAdapter.toSD(amountToCreditLD));
        bytes memory expectedComposeMsg = abi.encodePacked(addressToBytes32(address(this)), composeMsg);
        assertEq(composeMsg_, expectedComposeMsg);
    }

    function test_oft_build_msg_no_compose_msg() public view virtual override {
        uint32 dstEid = bEid;
        bytes32 to = addressToBytes32(userD);
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = dNativeOFTAdapter.removeDust(amountToSendLD);

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

        (bytes memory message, ) = dNativeOFTAdapter.buildMsgAndOptions(sendParam, amountToCreditLD);

        (bool isComposed_, bytes32 sendTo_, uint64 amountSD_, bytes memory composeMsg_) = this.decodeOFTMsgCodec(
            message
        );

        assertEq(isComposed_, false);
        assertEq(sendTo_, to);
        assertEq(amountSD_, dNativeOFTAdapter.toSD(amountToCreditLD));
        assertEq(composeMsg_, "");
    }

    function test_set_enforced_options() public virtual override {
        uint32 eid = 1;

        bytes memory optionsTypeOne = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        bytes memory optionsTypeTwo = OptionsBuilder.newOptions().addExecutorLzReceiveOption(250000, 0);

        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](2);
        enforcedOptions[0] = EnforcedOptionParam(eid, 1, optionsTypeOne);
        enforcedOptions[1] = EnforcedOptionParam(eid, 2, optionsTypeTwo);

        dNativeOFTAdapter.setEnforcedOptions(enforcedOptions);

        assertEq(dNativeOFTAdapter.enforcedOptions(eid, 1), optionsTypeOne);
        assertEq(dNativeOFTAdapter.enforcedOptions(eid, 2), optionsTypeTwo);
    }

    function test_assert_options_type3_revert() public virtual override {
        uint32 eid = dEid;
        EnforcedOptionParam[] memory enforcedOptions = new EnforcedOptionParam[](1);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0004"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0004"));
        dNativeOFTAdapter.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0002"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0002"));
        dNativeOFTAdapter.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0001"); // not type 3
        vm.expectRevert(abi.encodeWithSelector(IOAppOptionsType3.InvalidOptions.selector, hex"0001"));
        dNativeOFTAdapter.setEnforcedOptions(enforcedOptions);

        enforcedOptions[0] = EnforcedOptionParam(eid, 1, hex"0003"); // IS type 3
        dNativeOFTAdapter.setEnforcedOptions(enforcedOptions); // doesnt revert cus option type 3
    }

    function test_combine_options() public virtual override {
        uint32 eid = 1;
        uint16 msgType = 1;

        bytes memory enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        EnforcedOptionParam[] memory enforcedOptionsArray = new EnforcedOptionParam[](1);
        enforcedOptionsArray[0] = EnforcedOptionParam(eid, msgType, enforcedOptions);
        dNativeOFTAdapter.setEnforcedOptions(enforcedOptionsArray);

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            1.2345 ether,
            addressToBytes32(userA)
        );

        bytes memory expectedOptions = OptionsBuilder
            .newOptions()
            .addExecutorLzReceiveOption(200000, 0)
            .addExecutorNativeDropOption(1.2345 ether, addressToBytes32(userA));

        bytes memory combinedOptions = dNativeOFTAdapter.combineOptions(eid, msgType, extraOptions);
        assertEq(combinedOptions, expectedOptions);
    }

    function test_combine_options_no_extra_options() public virtual override {
        uint32 eid = 1;
        uint16 msgType = 1;

        bytes memory enforcedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        EnforcedOptionParam[] memory enforcedOptionsArray = new EnforcedOptionParam[](1);
        enforcedOptionsArray[0] = EnforcedOptionParam(eid, msgType, enforcedOptions);
        dNativeOFTAdapter.setEnforcedOptions(enforcedOptionsArray);

        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        bytes memory combinedOptions = dNativeOFTAdapter.combineOptions(eid, msgType, "");
        assertEq(combinedOptions, expectedOptions);
    }

    function test_combine_options_no_enforced_options() public view virtual override {
        uint32 eid = 1;
        uint16 msgType = 1;

        bytes memory extraOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            1.2345 ether,
            addressToBytes32(userD)
        );

        bytes memory expectedOptions = OptionsBuilder.newOptions().addExecutorNativeDropOption(
            1.2345 ether,
            addressToBytes32(userD)
        );

        bytes memory combinedOptions = dNativeOFTAdapter.combineOptions(eid, msgType, extraOptions);
        assertEq(combinedOptions, expectedOptions);
    }

    function test_oapp_inspector_inspect() public virtual override {
        uint32 dstEid = bEid;
        bytes32 to = addressToBytes32(userD);
        uint256 amountToSendLD = 1.23456789 ether;
        uint256 minAmountToCreditLD = dNativeOFTAdapter.removeDust(amountToSendLD);

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
        (bytes memory message, ) = dNativeOFTAdapter.buildMsgAndOptions(sendParam, amountToCreditLD);

        // deploy a universal inspector, it automatically reverts
        oAppInspector = new OFTInspectorMock();
        // set the inspector
        dNativeOFTAdapter.setMsgInspector(address(oAppInspector));

        // does revert because inspector is set
        vm.expectRevert(abi.encodeWithSelector(IOAppMsgInspector.InspectionFailed.selector, message, extraOptions));
        (message, ) = dNativeOFTAdapter.buildMsgAndOptions(sendParam, amountToCreditLD);
    }
}
