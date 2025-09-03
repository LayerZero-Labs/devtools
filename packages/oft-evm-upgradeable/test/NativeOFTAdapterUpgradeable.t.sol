// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

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
import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

import "forge-std/console.sol";
import { OFTTest } from "./OFT.t.sol";

contract NativeOFTAdapterUpgradeableTest is OFTTest {
    using OptionsBuilder for bytes;
    uint32 dEid = 4;

    NativeOFTAdapterUpgradeableMock dNativeOFTAdapter;

    address public userD = address(0x4);
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        vm.deal(userA, initialBalance);
        vm.deal(userB, initialBalance);
        vm.deal(userC, initialBalance);
        vm.deal(userD, initialNativeBalance);

        TestHelperOz5.setUp();
        setUpEndpoints(4, LibraryType.UltraLightNode);

        dNativeOFTAdapter = NativeOFTAdapterUpgradeableMock(
            _deployContractAndProxy(
                type(NativeOFTAdapterUpgradeableMock).creationCode,
                abi.encode(18, address(endpoints[dEid])),
                abi.encodeWithSelector(NativeOFTAdapterUpgradeableMock.initialize.selector, address(this))
            )
        );

        aOFT = OFTUpgradeableMock(address(dNativeOFTAdapter));

        bOFT = OFTUpgradeableMock(
            _deployContractAndProxy(
                type(OFTUpgradeableMock).creationCode,
                abi.encode(address(endpoints[bEid])),
                abi.encodeWithSelector(OFTUpgradeableMock.initialize.selector, "bOFT", "bOFT", address(this))
            )
        );

        cERC20Mock = new ERC20Mock("cToken", "cToken");
        cOFTAdapter = OFTAdapterUpgradeableMock(
            _deployContractAndProxy(
                type(OFTAdapterUpgradeableMock).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[cEid])),
                abi.encodeWithSelector(OFTAdapterUpgradeableMock.initialize.selector, address(this))
            )
        );

        // config and wire the ofts
        address[] memory ofts = new address[](4);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFTAdapter);
        ofts[3] = address(dNativeOFTAdapter);
        this.wireOApps(ofts);

        // mint tokens (skip aOFT since it's a native adapter - users already have ETH via vm.deal)
        bOFT.mint(userB, initialBalance);
        cERC20Mock.mint(userC, initialBalance);

        // deploy a universal inspector, can be used by each oft
        oAppInspector = new OFTInspectorMock();
    }

    function test_constructor() public view virtual override {
        assertEq(dNativeOFTAdapter.owner(), address(this));
        assertEq(dNativeOFTAdapter.token(), address(0));
        assertEq(dNativeOFTAdapter.approvalRequired(), false);
    }

    function test_native_oft_adapter_upgradeable_debit() public virtual {
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

    function test_native_oft_adapter_upgradeable_credit() public virtual {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = dEid;

        // simulate userD already having deposited native to the adapter
        vm.deal(address(dNativeOFTAdapter), amountToCreditLD);

        uint256 amountReceived = dNativeOFTAdapter.credit(userD, amountToCreditLD, srcEid);

        assertEq(amountReceived, amountToCreditLD);
        assertEq(userD.balance, initialNativeBalance + amountReceived);
        assertEq(address(dNativeOFTAdapter).balance, 0);
    }

    function test_native_oft_adapter_upgradeable_send() public virtual {
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

    function test_native_oft_adapter_upgradeable_send_compose_msg() public virtual {
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

    function test_send_oft() public virtual override {
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
        
        // For native adapter, msg.value must include both fee and token amount
        uint256 correctMsgValue = fee.nativeFee + tokensToSend;

        assertEq(userD.balance, initialNativeBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);

        vm.prank(userD);
        aOFT.send{ value: correctMsgValue }(sendParam, fee, payable(address(this)));
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        assertEq(userD.balance, initialNativeBalance - correctMsgValue);
        assertEq(bOFT.balanceOf(userB), initialBalance + tokensToSend);
    }

    function test_send_oft_compose_msg() public virtual override {
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
        
        // For native adapter, msg.value must include both fee and token amount
        uint256 correctMsgValue = fee.nativeFee + tokensToSend;

        assertEq(userD.balance, initialNativeBalance);
        assertEq(bOFT.balanceOf(address(composer)), 0);

        vm.prank(userD);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aOFT.send{ value: correctMsgValue }(
            sendParam,
            fee,
            payable(address(this))
        );
        verifyPackets(bEid, addressToBytes32(address(bOFT)));

        bytes memory composerMsg_ = OFTComposeMsgCodec.encode(
            msgReceipt.nonce,
            dEid,  // Use dEid since aOFT is the native adapter on dEid
            oftReceipt.amountReceivedLD,
            abi.encodePacked(addressToBytes32(userD), composeMsg)
        );
        this.lzCompose(bEid, address(bOFT), options, msgReceipt.guid, address(composer), composerMsg_);

        assertEq(userD.balance, initialNativeBalance - correctMsgValue);
        assertEq(bOFT.balanceOf(address(composer)), tokensToSend);

        assertEq(composer.from(), address(bOFT));
        assertEq(composer.guid(), msgReceipt.guid);
        assertEq(composer.message(), composerMsg_);
        assertEq(composer.executor(), address(this));
        assertEq(composer.extraData(), composerMsg_); // default to setting the extraData to the message as well to test
    }

    function test_oft_debit() public virtual override {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = bEid;

        // For native adapter, the debit function just calculates amounts
        // The actual ETH transfer happens in the send() function
        uint256 userBalanceBefore = dNativeOFTAdapter.balanceOf(userD);
        uint256 contractBalanceBefore = dNativeOFTAdapter.balanceOf(address(this));

        assertEq(userBalanceBefore, initialNativeBalance);

        vm.prank(userD);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = dNativeOFTAdapter.debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);

        // Balances remain the same because debit() only calculates, doesn't transfer
        uint256 userBalanceAfter = dNativeOFTAdapter.balanceOf(userD);
        uint256 contractBalanceAfter = dNativeOFTAdapter.balanceOf(address(this));
        
        assertEq(userBalanceAfter, userBalanceBefore);
        assertEq(contractBalanceAfter, contractBalanceBefore);
    }

    function test_oft_credit() public virtual override {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = dEid;

        // For native adapter, ensure the contract has ETH to credit from
        vm.deal(address(dNativeOFTAdapter), amountToCreditLD);

        uint256 userBalanceBefore = userD.balance;
        uint256 adapterBalanceBefore = address(dNativeOFTAdapter).balance;

        uint256 amountReceived = dNativeOFTAdapter.credit(userD, amountToCreditLD, srcEid);

        assertEq(amountReceived, amountToCreditLD);
        // Check that ETH was transferred from adapter to user
        assertEq(userD.balance, userBalanceBefore + amountReceived);
        assertEq(address(dNativeOFTAdapter).balance, adapterBalanceBefore - amountToCreditLD);
    }
}
