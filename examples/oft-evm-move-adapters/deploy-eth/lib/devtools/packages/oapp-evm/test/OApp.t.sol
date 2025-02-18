// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { ERC20Mock } from "./mocks/ERC20Mock.sol";
import { OAppMock } from "./mocks/OAppMock.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { MessagingParams, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OptionsBuilder } from "../contracts/oapp/libs/OptionsBuilder.sol";
import { console } from "forge-std/console.sol";

contract OAppTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    ERC20Mock nativeTokenMock_A = new ERC20Mock("NativeTokens_A", "NAT_A");

    uint32 private bEid = 2;
    ERC20Mock nativeTokenMock_B = new ERC20Mock("NativeTokens_B", "NAT_B");

    OAppMock private aOApp;
    OAppMock private bOApp;

    address private userA = address(0x1);
    address private userB = address(0x2);
    address private refundAddress = address(0x3);
    
    uint256 private initialBalance = 100 ether;

    bytes32 receiverB32 = bytes32(uint256(uint160(address(bOApp))));
    string message = "Hello world";

    address endpoint;

    bytes options;

    function setUp() public override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        aOApp = OAppMock(
            _deployOApp(type(OAppMock).creationCode, abi.encode(address(endpoints[aEid]), address(this)))
        );

        bOApp = OAppMock(
            _deployOApp(type(OAppMock).creationCode, abi.encode(address(endpoints[bEid]), address(this)))
        );

        address[] memory oapps = new address[](2);
        oapps[0] = address(aOApp);
        oapps[1] = address(bOApp);
        this.wireOApps(oapps);

        endpoint = address(aOApp.endpoint());
        options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
    }

    function test_constructor() public {
        assertEq(aOApp.owner(), address(this));
        assertEq(bOApp.owner(), address(this));

        assertEq(address(aOApp.endpoint()), address(endpoints[aEid]));
        assertEq(address(bOApp.endpoint()), address(endpoints[bEid]));
    }
    function test_Send() public {
        vm.startPrank(userA);

        MessagingParams memory msgParams = MessagingParams(bEid, receiverB32, abi.encode(message), options, false);

        uint256 quoteFee = aOApp.endpoint().quote(msgParams, address(this)).nativeFee;
        uint256 twiceQuoteFee = quoteFee * 2;

        MessagingReceipt memory receipt = aOApp.endpoint().send{value: twiceQuoteFee}(msgParams, refundAddress);

        assertEq(receipt.fee.nativeFee, quoteFee);
        assertEq(receipt.fee.lzTokenFee, 0);

        assertEq(address(endpoint).balance, 0);
        assertEq(refundAddress.balance, quoteFee);
        assertEq((endpointSetup.sendLibs[0]).balance, quoteFee);
    }

    function test_OAppSend() public {
        vm.startPrank(userA);

        uint256 quoteFee = aOApp.quote(bEid, message, options, false).nativeFee;
        uint256 twiceQuoteFee = quoteFee * 2;

        MessagingReceipt memory receipt = aOApp.send{value: twiceQuoteFee}(bEid, message, options, twiceQuoteFee);
        verifyPackets(bEid, addressToBytes32(address(bOApp)));

        assertEq(receipt.fee.nativeFee, quoteFee);
        assertEq(receipt.fee.lzTokenFee, 0);

        assertEq(address(endpoint).balance, 0);
        assertEq((endpointSetup.sendLibs[0]).balance, quoteFee);
    }
}
