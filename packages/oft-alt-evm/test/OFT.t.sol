// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

import { OFTAltMock } from "./mocks/OFTAltMock.sol";
import { MessagingFee, MessagingReceipt } from "../contracts/OFTAltCore.sol";
import { NativeOFTAdapterMock } from "./mocks/NativeOFTAdapterMock.sol";
import { OFTAdapterMock } from "./mocks/OFTAdapterMock.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { OFTComposerMock } from "./mocks/OFTComposerMock.sol";
import { OFTInspectorMock, IOAppMsgInspector } from "./mocks/OFTInspectorMock.sol";
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";

// TODO: Change this import to @layerzerolabs/oapp-alt-evm once the package is published
import { OAppSenderAlt } from "/workspaces/devtools/packages/oapp-alt-evm/contracts/oapp/OAppSenderAlt.sol";

import { OFTMsgCodec } from "../contracts/libs/OFTMsgCodec.sol";
import { OFTComposeMsgCodec } from "../contracts/libs/OFTComposeMsgCodec.sol";

import { IOFT, SendParam, OFTReceipt } from "../contracts/interfaces/IOFT.sol";
import { OFTAlt } from "../contracts/OFTAlt.sol";
import { NativeOFTAdapter } from "../contracts/NativeOFTAdapter.sol";
import { OFTAdapter } from "../contracts/OFTAdapter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { OFTMockCodec } from "./lib/OFTMockCodec.sol";
import { OFTAdapterMockCodec } from "./lib/OFTAdapterMockCodec.sol";
import { NativeOFTAdapterMockCodec } from "./lib/NativeOFTAdapterMockCodec.sol";

import { console } from "forge-std/console.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract OFTTest is TestHelperOz5 {
    using OptionsBuilder for bytes;
    using OFTMockCodec for OFTAlt;
    using OFTAdapterMockCodec for OFTAdapter;
    using NativeOFTAdapterMockCodec for NativeOFTAdapter;

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
    NativeOFTAdapter internal dNativeOFTAdapter;
    OFTAdapter internal cOFTAdapter;
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
        cOFTAdapter = OFTAdapterMock(
            _deployOApp(
                type(OFTAdapterMock).creationCode,
                abi.encode(address(cERC20Mock), address(endpoints[C_EID]), address(this))
            )
        );

        dNativeOFTAdapter = NativeOFTAdapterMock(
            _deployOApp(
                type(NativeOFTAdapterMock).creationCode,
                abi.encode(18, address(endpoints[D_EID]), address(this))
            )
        );

        // config and wire the ofts
        address[] memory ofts = new address[](4);
        ofts[0] = address(aOFT);
        ofts[1] = address(bOFT);
        ofts[2] = address(cOFTAdapter);
        ofts[3] = address(dNativeOFTAdapter);
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

    function test_constructor() public {
        assertEq(aOFT.owner(), address(this));
        assertEq(bOFT.owner(), address(this));
        assertEq(cOFTAdapter.owner(), address(this));
        assertEq(dNativeOFTAdapter.owner(), address(this));

        assertEq(aOFT.balanceOf(userA), initialBalance);
        assertEq(bOFT.balanceOf(userB), initialBalance);
        assertEq(IERC20(cOFTAdapter.token()).balanceOf(userC), initialBalance);

        assertEq(aOFT.token(), address(aOFT));
        assertEq(bOFT.token(), address(bOFT));
        assertEq(cOFTAdapter.token(), address(cERC20Mock));
        assertEq(dNativeOFTAdapter.token(), address(0));

        assertEq(dNativeOFTAdapter.approvalRequired(), false);
    }

    function test_oftVersion() public {
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
}
