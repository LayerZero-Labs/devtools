// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { OFTInitializableMock } from "./mocks/OFTInitializableMock.sol";
import { MessagingFee, MessagingReceipt, OFTFeeDetail, OFTLimit, OFTReceipt } from "../contracts/OFTCoreInitializable.sol";
import { NativeOFTAdapterInitializableMock } from "./mocks/NativeOFTAdapterInitializableMock.sol";
import { OFTAdapterInitializableMock } from "./mocks/OFTAdapterInitializableMock.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { MintBurnERC20Mock } from "./mocks/MintBurnERC20Mock.sol";
import { ElevatedMinterBurnerMock } from "./mocks/ElevatedMinterBurnerMock.sol";
import { MintBurnOFTAdapterInitializableMock } from "./mocks/MintBurnOFTAdapterInitializableMock.sol";
import { OFTComposerMock } from "./mocks/OFTComposerMock.sol";
import { OFTInspectorMock, IOAppMsgInspector } from "./mocks/OFTInspectorMock.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OAppSender } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

import { OFTMsgCodec } from "../contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "../contracts/libs/OFTComposeMsgCodec.sol";

import { IOFT, SendParam, OFTReceipt } from "../contracts/interfaces/IOFT.sol";
import { OFTInitializable } from "../contracts/OFTInitializable.sol";
import { MintBurnOFTAdapterInitializable } from "../contracts/MintBurnOFTAdapterInitializable.sol";
import { IMintableBurnable } from "../contracts/interfaces/IMintableBurnable.sol";
import { NativeOFTAdapterInitializable } from "../contracts/NativeOFTAdapterInitializable.sol";
import { OFTAdapterInitializable } from "../contracts/OFTAdapterInitializable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { OFTInitializableMockCodec } from "./lib/OFTInitializableMockCodec.sol";
import { OFTAdapterInitializableMockCodec } from "./lib/OFTAdapterInitializableMockCodec.sol";
import { NativeOFTAdapterInitializableMockCodec } from "./lib/NativeOFTAdapterInitializableMockCodec.sol";
import { MintBurnOFTAdapterInitializableMockCodec } from "./lib/MintBurnOFTAdapterInitializableMockCodec.sol";

import "forge-std/console.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract OFTInitializableTest is TestHelperOz5 {
    using OptionsBuilder for bytes;
    using OFTInitializableMockCodec for OFTInitializable;
    using OFTAdapterInitializableMockCodec for OFTAdapterInitializable;
    using NativeOFTAdapterInitializableMockCodec for NativeOFTAdapterInitializable;
    using MintBurnOFTAdapterInitializableMockCodec for MintBurnOFTAdapterInitializable;

    uint32 internal constant A_EID = 1;
    uint32 internal constant B_EID = 2;
    uint32 internal constant C_EID = 3;
    uint32 internal constant D_EID = 4;
    uint32 internal constant E_EID = 5;
    uint32 internal constant X_EID = 5;

    string internal constant A_OFT_NAME = "aOFT";
    string internal constant A_OFT_SYMBOL = "aOFT";
    string internal constant B_OFT_NAME = "bOFT";
    string internal constant B_OFT_SYMBOL = "bOFT";
    string internal constant C_TOKEN_NAME = "cToken";
    string internal constant C_TOKEN_SYMBOL = "cToken";
    string internal constant E_MINTABLE_TOKEN_NAME = "eMintableToken";
    string internal constant E_MINTABLE_TOKEN_SYMBOL = "eToken";
    string internal constant X_OFT_NAME = "xOFT";
    string internal constant X_OFT_SYMBOL = "xOFT";


    OFTInitializable internal aOFT;
    OFTInitializable internal bOFT;
    OFTInitializable internal xOFT;
    OFTAdapterInitializable internal cOFTAdapter;
    ERC20Mock internal cERC20Mock;
    NativeOFTAdapterInitializable internal dNativeOFTAdapter;
    MintBurnOFTAdapterInitializable internal eMintBurnOFTAdapter;
    ElevatedMinterBurnerMock internal eMinterBurnerMock;
    MintBurnERC20Mock internal eMintBurnERC20Mock;

    OFTInspectorMock internal oAppInspector;

    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");
    address public userC = makeAddr("userC");
    address public userD = makeAddr("userD");
    address public userE = makeAddr("userE");
    address public attacker = makeAddr("attacker");
    uint256 public initialBalance = 100 ether;
    uint256 public initialNativeBalance = 1000 ether;

    function setUp() public virtual override {
        _deal();

        super.setUp();
        setUpEndpoints(5, LibraryType.UltraLightNode);

        aOFT = OFTInitializableMock(
            _deployOApp(
                type(OFTInitializableMock).creationCode,
                abi.encode(address(endpoints[A_EID]), address(this))
            )
        );
        aOFT.initialize(A_OFT_NAME, A_OFT_SYMBOL, 18);

        bOFT = OFTInitializableMock(
            _deployOApp(
                type(OFTInitializableMock).creationCode,
                abi.encode(address(endpoints[B_EID]), address(this))
            )
        );
        bOFT.initialize(B_OFT_NAME, B_OFT_SYMBOL, 18);

        xOFT = OFTInitializableMock(
            _deployOApp(
                type(OFTInitializableMock).creationCode,
                abi.encode(address(endpoints[X_EID]), address(this))
            )
        );

        cERC20Mock = new ERC20Mock(C_TOKEN_NAME, C_TOKEN_SYMBOL);
        cOFTAdapter = OFTAdapterInitializableMock(
            _deployOApp(
                type(OFTAdapterInitializableMock).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[C_EID]), address(this))
            )
        );

        dNativeOFTAdapter = NativeOFTAdapterInitializableMock(
            _deployOApp(
                type(NativeOFTAdapterInitializableMock).creationCode,
                abi.encode(18, address(endpoints[D_EID]), address(this))
            )
        );

        eMintBurnERC20Mock = new MintBurnERC20Mock(E_MINTABLE_TOKEN_NAME, E_MINTABLE_TOKEN_SYMBOL);
        eMinterBurnerMock = new ElevatedMinterBurnerMock(IMintableBurnable(eMintBurnERC20Mock), address(this));
        eMintBurnOFTAdapter = MintBurnOFTAdapterInitializableMock(
            _deployOApp(
                type(MintBurnOFTAdapterInitializableMock).creationCode,
                abi.encode(address(eMintBurnERC20Mock), address(eMinterBurnerMock), address(endpoints[E_EID]), address(this))
            )
        );
        eMinterBurnerMock.setOperator(address(eMintBurnOFTAdapter), true);

        // config and wire the ofts
        address[] memory ofts = new address[](5);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFTAdapter);
        ofts[3] = address(dNativeOFTAdapter);
        ofts[4] = address(eMintBurnOFTAdapter);
        this.wireOApps(ofts);

        // mint tokens
        aOFT.asOFTInitializableMock().mint(userA, initialBalance);
        bOFT.asOFTInitializableMock().mint(userB, initialBalance);
        cERC20Mock.mint(userC, initialBalance);
        eMintBurnERC20Mock.mint(userE, initialBalance);

        // deploy a universal inspector, can be used by each oft
        oAppInspector = new OFTInspectorMock();
    }

    function _deal() internal {
        vm.deal(userA, initialNativeBalance);
        vm.deal(userB, initialNativeBalance);
        vm.deal(userC, initialNativeBalance);
        vm.deal(userD, initialNativeBalance);
        vm.deal(userE, initialNativeBalance);
    }

    function test_constructor() public {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));
        assertEq(cOFTAdapter.owner(), address(this));
        assertEq(dNativeOFTAdapter.owner(), address(this));
        assertEq(eMintBurnOFTAdapter.owner(), address(this));

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);
        assertEq(IERC20(cOFTAdapter.token()).balanceOf(userC), initialBalance);
        assertEq(IERC20(eMintBurnOFTAdapter.token()).balanceOf(userE), initialBalance);

        assertEq(aOFT.token(), address(aOFT));
        assertEq(bOFT.token(), address(bOFT));
        assertEq(cOFTAdapter.token(), address(cERC20Mock));
        assertEq(dNativeOFTAdapter.token(), address(0));
        assertEq(eMintBurnOFTAdapter.token(), address(eMintBurnERC20Mock));

        assertEq(dNativeOFTAdapter.approvalRequired(), false);
        assertEq(eMintBurnOFTAdapter.approvalRequired(), false);
    }

    function test_initializer() public {
        assertEq(aOFT.name(), A_OFT_NAME);
        assertEq(aOFT.symbol(), A_OFT_SYMBOL);
        assertEq(aOFT.decimals(), 18);

        assertEq(xOFT.name(), "");
        assertEq(xOFT.symbol(), "");

        xOFT.initialize(X_OFT_NAME, X_OFT_SYMBOL, 18);
        
        assertEq(xOFT.name(), X_OFT_NAME);
        assertEq(xOFT.symbol(), X_OFT_SYMBOL);
        assertEq(xOFT.decimals(), 18);
    }

    function test_oftVersion() public {
        (bytes4 interfaceId, ) = aOFT.oftVersion();
        bytes4 expectedId = 0x02e49c2c;
        assertEq(interfaceId, expectedId);
    }

    function test_send_oft(uint256 tokensToSend) public virtual {
        vm.assume(tokensToSend > 0.001 ether && tokensToSend < 100 ether); // avoid reverting due to SlippageExceeded

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
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);

        if (aOFT.asOFTInitializableMock().approvalRequired()) {
            vm.prank(userA);
            aOFT.asIERC20().approve(address(aOFT), tokensToSend);
        }
        vm.prank(userA);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aOFT.send{ value: fee.nativeFee }(
            sendParam,
            fee,
            payable(address(this))
        );
        verifyPackets(B_EID, addressToBytes32(address(bOFT)));

        assertEq(msgReceipt.fee.nativeFee, fee.nativeFee);
        assertEq(aOFT.balanceOf(userA), initialBalance - oftReceipt.amountSentLD);
        assertEq(bOFT.balanceOf(userB), initialBalance + oftReceipt.amountReceivedLD);
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
        MessagingFee memory fee = aOFT.quoteSend(sendParam, false);

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(address(composer)), 0);

        if (aOFT.asOFTInitializableMock().approvalRequired()) {
            vm.prank(userA);
            aOFT.asIERC20().approve(address(aOFT), tokensToSend);
        }
        vm.prank(userA);
        (MessagingReceipt memory msgReceipt, OFTReceipt memory oftReceipt) = aOFT.send{ value: fee.nativeFee }(
            sendParam,
            fee,
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
    ) public {
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
        assertEq(aOFT.asOFTInitializableMock().removeDust(amountToSendLD), 1.234567 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                IOFT.SlippageExceeded.selector,
                aOFT.asOFTInitializableMock().removeDust(amountToSendLD),
                minAmountToCreditLD
            )
        );
        aOFT.asOFTInitializableMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_debit_slippage_minAmountToCreditLD() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1.00000001 ether;
        uint32 dstEid = A_EID;

        vm.expectRevert(abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD));
        aOFT.asOFTInitializableMock().debit(amountToSendLD, minAmountToCreditLD, dstEid);
    }

    function test_toLD(uint64 amountSD) public {
        assertEq(amountSD * OFTInitializableMock(address(aOFT)).decimalConversionRate(), aOFT.asOFTInitializableMock().toLD(uint64(amountSD)));
    }

    function test_toSD(uint256 amountLD) public {
        vm.assume(amountLD <= type(uint64).max); // avoid reverting due to overflow
        assertEq(amountLD / aOFT.asOFTInitializableMock().decimalConversionRate(), aOFT.asOFTInitializableMock().toSD(amountLD));
    }

    function test_oft_debit() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = A_EID;

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(aOFT.balanceOf(address(this)), 0);

        vm.prank(userA);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = aOFT.asOFTInitializableMock().debit(
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
        uint256 amountReceived = aOFT.asOFTInitializableMock().credit(userA, amountToCreditLD, srcEid);

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
        cOFTAdapter.asOFTAdapterMock().debitView(amountToSendLD, minAmountToCreditLD + 1, dstEid);

        vm.prank(userC);
        cERC20Mock.approve(address(cOFTAdapter), amountToSendLD);
        vm.prank(userC);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = cOFTAdapter.asOFTAdapterMock().debit(
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

        uint256 amountReceived = cOFTAdapter.asOFTAdapterMock().credit(userB, amountToCreditLD, srcEid);

        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountToCreditLD);
        assertEq(cERC20Mock.balanceOf(address(userB)), amountReceived);
        assertEq(cERC20Mock.balanceOf(address(cOFTAdapter)), 0);
    }

    function test_native_oft_adapter_debit() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = D_EID;

        vm.prank(userD);
        vm.expectRevert(
            abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD + 1)
        );
        dNativeOFTAdapter.asNativeOFTAdapterInitializableMock().debit(amountToSendLD, minAmountToCreditLD + 1, dstEid);

        vm.prank(userD);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = dNativeOFTAdapter.asNativeOFTAdapterInitializableMock().debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);
    }

    function test_native_oft_adapter_credit() public {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = D_EID;

        // simulate userD already having deposited native to the adapter
        vm.deal(address(dNativeOFTAdapter), amountToCreditLD);

        uint256 amountReceived = dNativeOFTAdapter.asNativeOFTAdapterInitializableMock().credit(userB, amountToCreditLD, srcEid);

        assertEq(userB.balance, initialNativeBalance + amountReceived);
        assertEq(address(dNativeOFTAdapter).balance, 0);
    }

    function test_native_oft_adapter_send() public virtual {
        assertEq(userD.balance, initialNativeBalance);
        assertEq(address(dNativeOFTAdapter).balance, 0);

        uint256 amountToSendLD = 1 ether;
        uint32 dstEid = B_EID;

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
            abi.encodeWithSelector(NativeOFTAdapterInitializable.IncorrectMessageValue.selector, fee.nativeFee, correctMsgValue)
        );
        dNativeOFTAdapter.asNativeOFTAdapterInitializableMock().send{ value: fee.nativeFee}(sendParam, fee, userD);

        // expect sending wrapped native to succeed if the amount to be sent and the fee are both included in msg.value
        vm.prank(userD);
        dNativeOFTAdapter.asNativeOFTAdapterInitializableMock().send{ value: correctMsgValue }(sendParam, fee, userD);

        assertEq(userD.balance, initialNativeBalance - correctMsgValue);
        assertEq(address(dNativeOFTAdapter).balance, amountToSendLD);

        // expect sending wrapped native to fail if extra msg.value is provided 
        // i.e msg.value > amount to be sent (with dust removed) + fee
        uint256 extraMsgValue = correctMsgValue + 1;
        vm.prank(userD);
        vm.expectRevert(
            abi.encodeWithSelector(NativeOFTAdapterInitializable.IncorrectMessageValue.selector, extraMsgValue, correctMsgValue)
        );
        dNativeOFTAdapter.asNativeOFTAdapterInitializableMock().send{ value: extraMsgValue}(sendParam, fee, userD);
    }

    function test_set_minter_burner_operator() public {
        vm.prank(attacker);
        vm.expectRevert();
        eMinterBurnerMock.setOperator(address(eMintBurnOFTAdapter), true);
    }

    function test_minter_burner_operator() public {
        vm.prank(attacker);
        vm.expectRevert();
        eMinterBurnerMock.mint(attacker, initialBalance);
    }

    function test_burn_operator() public {
        vm.prank(attacker);
        vm.expectRevert();
        eMinterBurnerMock.burn(attacker, initialBalance);
    }
    
    function test_mint_burn_oft_adapter_debit() public virtual {
        uint256 amountToSendLD = 1 ether;
        uint256 minAmountToCreditLD = 1 ether;
        uint32 dstEid = E_EID;

        vm.prank(userE);
        vm.expectRevert(
            abi.encodeWithSelector(IOFT.SlippageExceeded.selector, amountToSendLD, minAmountToCreditLD + 1)
        );
        eMintBurnOFTAdapter.asMintBurnOFTAdapterInitializableMock().debit(amountToSendLD, minAmountToCreditLD + 1, dstEid);

        vm.prank(userE);
        (uint256 amountDebitedLD, uint256 amountToCreditLD) = eMintBurnOFTAdapter.asMintBurnOFTAdapterInitializableMock().debit(
            amountToSendLD,
            minAmountToCreditLD,
            dstEid
        );

        assertEq(amountDebitedLD, amountToSendLD);
        assertEq(amountToCreditLD, amountToSendLD);
    }

    function test_mint_burn_oft_adapter_credit() public {
        uint256 amountToCreditLD = 1 ether;
        uint32 srcEid = C_EID;

        vm.prank(userC);
        cERC20Mock.transfer(address(cOFTAdapter), amountToCreditLD);

        uint256 amountReceived = eMintBurnOFTAdapter.asMintBurnOFTAdapterInitializableMock().credit(userE, amountToCreditLD, srcEid);

        assertEq(cERC20Mock.balanceOf(userC), initialBalance - amountToCreditLD);
        assertEq(eMintBurnERC20Mock.balanceOf(address(userE)), initialBalance + amountReceived);
    }

    function test_mint_burn_oft_adapter_send() public {
        uint256 tokensToSend = 1 ether;
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        SendParam memory sendParam = SendParam(
            B_EID,
            addressToBytes32(userB),
            tokensToSend,
            tokensToSend,
            options,
            "",
            ""
        );
        MessagingFee memory fee = eMintBurnOFTAdapter.quoteSend(sendParam, false);

        assertEq(eMintBurnERC20Mock.balanceOf(userE), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);

        vm.startPrank(userE);
        eMintBurnOFTAdapter.send{ value: fee.nativeFee }(sendParam, fee, payable(address(this)));
        vm.stopPrank();
        verifyPackets(B_EID, addressToBytes32(address(bOFT)));

        assertEq(eMintBurnERC20Mock.balanceOf(userE), initialBalance - tokensToSend);
        assertEq(bOFT.balanceOf(userB), initialBalance + tokensToSend);
    }

    function decodeOFTMsgCodec(
        bytes calldata message
    ) public pure returns (bool isComposed, bytes32 sendTo, uint64 amountSD, bytes memory composeMsg) {
        isComposed = OFTMsgCodec.isComposed(message);
        sendTo = OFTMsgCodec.sendTo(message);
        amountSD = OFTMsgCodec.amountSD(message);
        composeMsg = OFTMsgCodec.composeMsg(message);
    }

    function test_oft_build_msg(uint32 dstEid, bytes32 to, uint256 amountToSendLD, bytes memory composeMsg) public {
        vm.assume(composeMsg.length > 0); // ensure there is a composed payload
        uint256 minAmountToCreditLD = aOFT.asOFTInitializableMock().removeDust(amountToSendLD);

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

        (bytes memory message, ) = aOFT.asOFTInitializableMock().buildMsgAndOptions(sendParam, amountToCreditLD);

        (bool isComposed_, bytes32 sendTo_, uint64 amountSD_, bytes memory composeMsg_) = this.decodeOFTMsgCodec(
            message
        );

        assertEq(isComposed_, true);
        assertEq(sendTo_, to);
        assertEq(amountSD_, aOFT.asOFTInitializableMock().toSD(amountToCreditLD));
        bytes memory expectedComposeMsg = abi.encodePacked(addressToBytes32(address(this)), composeMsg);
        assertEq(composeMsg_, expectedComposeMsg);
    }

    function test_oft_build_msg_no_compose_msg(uint32 dstEid, bytes32 to, uint256 amountToSendLD) public {
        uint256 minAmountToCreditLD = aOFT.asOFTInitializableMock().removeDust(amountToSendLD);

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

        (bytes memory message, ) = aOFT.asOFTInitializableMock().buildMsgAndOptions(sendParam, amountToCreditLD);

        (bool isComposed_, bytes32 sendTo_, uint64 amountSD_, bytes memory composeMsg_) = this.decodeOFTMsgCodec(
            message
        );

        assertEq(isComposed_, false);
        assertEq(sendTo_, to);
        assertEq(amountSD_, aOFT.asOFTInitializableMock().toSD(amountToCreditLD));
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
    ) public {
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
        uint256 minAmountToCreditLD = aOFT.asOFTInitializableMock().removeDust(amountToSendLD);

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
        (bytes memory message, ) = aOFT.asOFTInitializableMock().buildMsgAndOptions(sendParam, amountToCreditLD);

        // deploy a universal inspector, it automatically reverts
        oAppInspector = new OFTInspectorMock();
        // set the inspector
        aOFT.setMsgInspector(address(oAppInspector));

        // does revert because inspector is set
        vm.expectRevert(abi.encodeWithSelector(IOAppMsgInspector.InspectionFailed.selector, message, extraOptions));
        (message, ) = aOFT.asOFTInitializableMock().buildMsgAndOptions(sendParam, amountToCreditLD);
    }

    function test_quoteOFT(uint256 _amountToSendLD) public {
        bytes32 to = addressToBytes32(userA);
        uint256 minAmountToCreditLD = aOFT.asOFTInitializableMock().removeDust(_amountToSendLD);
        SendParam memory sendParam = SendParam(
            B_EID,
            to,
            _amountToSendLD,
            minAmountToCreditLD,
            "",
            "",
            ""
        );
        (OFTLimit memory oftLimit, OFTFeeDetail[] memory oftFeeDetails, OFTReceipt memory oftReceipt) = aOFT.quoteOFT(sendParam);
        assertEq(0, oftLimit.minAmountLD);
        assertEq(IERC20(aOFT.token()).totalSupply(), oftLimit.maxAmountLD);
        assertEq(0, oftFeeDetails.length);
        assertEq(minAmountToCreditLD, oftReceipt.amountSentLD);
        assertEq(minAmountToCreditLD, oftReceipt.amountReceivedLD);
    }
}
