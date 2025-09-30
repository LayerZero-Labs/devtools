// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { ERC20Mock } from "@layerzerolabs/oapp-evm/test/mocks/ERC20Mock.sol";
import { MyOAppAlt } from "./mocks/OAppAltMock.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { MessagingParams, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { console } from "forge-std/console.sol";

contract OAppAltTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    ERC20Mock nativeTokenMock_A = new ERC20Mock("NativeAltTokens_A", "NAT_A");

    uint32 private bEid = 2;
    ERC20Mock nativeTokenMock_B = new ERC20Mock("NativeAltTokens_B", "NAT_B");

    address[] public altToken;

    MyOAppAlt private aOApp;
    MyOAppAlt private bOApp;

    address private userA = address(0x1);
    address private userB = address(0x2);
    uint256 private initialBalance = 100 ether;

    bytes32 receiverB32 = bytes32(uint256(uint160(address(bOApp))));
    string message = "Hello world";

    address endpointAlt;

    bytes options;

    function setUp() public override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);
        altToken.push(address(nativeTokenMock_A));
        altToken.push(address(nativeTokenMock_B));

        super.setUp();
        createEndpoints(2, LibraryType.SimpleMessageLib, altToken);

        aOApp = MyOAppAlt(
            _deployOApp(type(MyOAppAlt).creationCode, abi.encode(address(endpoints[aEid]), address(this)))
        );

        bOApp = MyOAppAlt(
            _deployOApp(type(MyOAppAlt).creationCode, abi.encode(address(endpoints[bEid]), address(this)))
        );

        address[] memory oapps = new address[](2);
        oapps[0] = address(aOApp);
        oapps[1] = address(bOApp);
        this.wireOApps(oapps);

        endpointAlt = address(aOApp.endpoint());
        options = bytes("");
    }

    function test_constructor() public view {
        assertEq(aOApp.owner(), address(this));
        assertEq(bOApp.owner(), address(this));

        assertEq(address(aOApp.endpoint()), address(endpoints[aEid]));
        assertEq(address(bOApp.endpoint()), address(endpoints[bEid]));
    }
    function test_Send_WithAlt() public {
        vm.startPrank(userA);

        MessagingParams memory msgParams = MessagingParams(bEid, receiverB32, abi.encode(message), options, false);

        uint256 quoteFee = aOApp.endpoint().quote(msgParams, address(this)).nativeFee;
        uint256 twiceQuoteFee = quoteFee * 2;

        nativeTokenMock_A.mint(userA, twiceQuoteFee);
        nativeTokenMock_A.transfer(address(endpointAlt), twiceQuoteFee);

        MessagingReceipt memory receipt = aOApp.endpoint().send(msgParams, userA);

        assertEq(receipt.fee.nativeFee, quoteFee);
        assertEq(receipt.fee.lzTokenFee, 0);

        assertEq(nativeTokenMock_A.balanceOf(address(endpointAlt)), 0);
        assertEq(nativeTokenMock_A.balanceOf(userA), quoteFee);
        assertEq(nativeTokenMock_A.balanceOf(endpointSetup.sendLibs[0]), quoteFee);
    }

    function test_OAppSend_WithAlt() public {
        vm.startPrank(userA);

        uint256 quoteFee = aOApp.quote(bEid, message, options, false).nativeFee;
        uint256 twiceQuoteFee = quoteFee * 2;

        nativeTokenMock_A.mint(userA, twiceQuoteFee);
        IERC20(nativeTokenMock_A).approve(address(aOApp), twiceQuoteFee);
        MessagingReceipt memory receipt = aOApp.send(bEid, message, options, twiceQuoteFee);

        assertEq(receipt.fee.nativeFee, quoteFee);
        assertEq(receipt.fee.lzTokenFee, 0);

        assertEq(nativeTokenMock_A.balanceOf(address(endpointAlt)), 0);
        assertEq(nativeTokenMock_A.balanceOf(userA), quoteFee);
        assertEq(nativeTokenMock_A.balanceOf(endpointSetup.sendLibs[0]), quoteFee);
    }

    function test_OAppSend_WithAlt_WithVerify() public {
        options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        uint256 preETHBalance_userA = userA.balance;

        test_OAppSend_WithAlt();

        verifyPackets(bEid, addressToBytes32(address(bOApp)));

        uint256 postETHBalance_userA = userA.balance;
        assertEq(preETHBalance_userA, postETHBalance_userA);
    }
}
