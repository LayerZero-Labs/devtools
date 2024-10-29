// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { MyOAppAlt } from "./mocks/OAppAltMock.sol";
import { TestHelperOz5 } from "/workspaces/devtools/packages/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { MessagingParams, MessagingReceipt } from "/workspaces/devtools/examples/oapp/node_modules/@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OptionsBuilder } from "/workspaces/devtools/examples/oapp/node_modules/@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

contract EndpointV2AltTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    address[] public altToken;
    ERC20Mock nativeTokenMock_A = new ERC20Mock("NativeAltTokens_A", "NAT_A");
    ERC20Mock nativeTokenMock_B = new ERC20Mock("NativeAltTokens_B", "NAT_B");

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    MyOAppAlt private aOApp;
    MyOAppAlt private bOApp;

    address private userA = address(0x1);
    address private userB = address(0x2);
    uint256 private initialBalance = 100 ether;

    bytes32 receiverB32 = bytes32(uint256(uint160(address(bOApp))));
    address refundAddress = payable(address(123));

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
    }

    function test_constructor() public {
        assertEq(aOApp.owner(), address(this));
        assertEq(bOApp.owner(), address(this));

        assertEq(address(aOApp.endpoint()), address(endpoints[aEid]));
        assertEq(address(bOApp.endpoint()), address(endpoints[bEid]));
    }
    function test_Send_WithAlt() public {
        address endpointAlt = address(aOApp.endpoint());
        bytes memory message;

        vm.startPrank(userA);

        nativeTokenMock_A.mint(userA, 200);
        nativeTokenMock_A.transfer(address(endpointAlt), 200);

        // send with 200 alt, but only accept 100 alt
        MessagingParams memory msgParams = MessagingParams(bEid, receiverB32, message, "", false);
        MessagingReceipt memory receipt = aOApp.endpoint().send(msgParams, refundAddress);

        assertEq(receipt.fee.nativeFee, 100);
        assertEq(receipt.fee.lzTokenFee, 0);

        assertEq(nativeTokenMock_A.balanceOf(address(endpointAlt)), 0);
        assertEq(nativeTokenMock_A.balanceOf(refundAddress), 100);
        assertEq(nativeTokenMock_A.balanceOf(endpointSetup.sendLibs[0]), 100);
    }
}
