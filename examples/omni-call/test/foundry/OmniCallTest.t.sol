// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { console } from "forge-std/Test.sol";
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

//  ==========  Internal imports    ==========

import { OmniCall, MessagingFee, MessagingReceipt, Origin, MessageType, Call, Transfer } from "../../contracts/OmniCall.sol";
import { OmniCallMsgCodecLib } from "../../contracts/OmniCallMsgCodecLib.sol";
import { ERC20Mock } from "./ERC20Mock.sol";
import { OmniCallFixture } from "./OmniCallFixture.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title Generic omnichain proxy test.
 * @author LayerZeroLabs (@EWCunha).
 */
contract OmniCallTest is TestHelperOz5 {
    OmniCall public srcOmniCall;
    OmniCall public dstOmniCall;
    OmniCallFixture public fixture;

    ERC20Mock public token;

    uint32 public srcEid = 1;
    uint32 public dstEid = 2;
    uint32 public fixtureEid = 3;

    address public owner = makeAddr("owner");
    address public srcAddress = makeAddr("srcAddress");
    address public dstAddress = makeAddr("dstAddress");

    uint256 public constant INITIAL_BALANCE = 10 ether;

    // struct MessagingReceipt {
    //     bytes32 guid;
    //     uint64 nonce;
    //     MessagingFee fee;
    // }

    // struct MessagingFee {
    //     uint256 nativeFee;
    //     uint256 lzTokenFee;
    // }

    /// -----------------------------------------------------------------------
    /// Set-up
    /// -----------------------------------------------------------------------

    function setUp() public override {
        deal(srcAddress, INITIAL_BALANCE);
        deal(dstAddress, INITIAL_BALANCE);

        super.setUp();

        setUpEndpoints(3, LibraryType.UltraLightNode);

        token = new ERC20Mock("Mock", "MCK");
        srcOmniCall = new OmniCall(endpoints[srcEid], owner);
        dstOmniCall = new OmniCall(endpoints[dstEid], owner);
        fixture = new OmniCallFixture(endpoints[fixtureEid], owner);

        address[] memory omniCalls = new address[](3);
        omniCalls[0] = address(srcOmniCall);
        omniCalls[1] = address(dstOmniCall);
        omniCalls[2] = address(fixture);
        vm.startPrank(owner);
        wireOApps(omniCalls);
        vm.stopPrank();

        deal(address(srcOmniCall), INITIAL_BALANCE);
        deal(address(dstOmniCall), INITIAL_BALANCE);
    }

    /// -----------------------------------------------------------------------
    /// State-change public/external functions
    /// -----------------------------------------------------------------------

    //  ==========  send  ==========

    function testSendNativeTokenSuccess() public {
        uint128 dstGasLimit = 50_000;
        uint128 dstMsgValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            MessageType.NON_ATOMIC,
            dstEid,
            Call(address(0), 0, ""),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            MessageType.NON_ATOMIC,
            dstEid,
            Call(address(0), 0, ""),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(dstAddress.balance, INITIAL_BALANCE + dstMsgValue);
    }

    function testSendCalldataSuccess() public {
        uint128 dstGasLimit = 500_000;
        uint128 dstMsgValue = 0;

        MessagingFee memory fee = srcOmniCall.quote(
            MessageType.ATOMIC,
            dstEid,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(address(0), dstMsgValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            MessageType.ATOMIC,
            dstEid,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(dstAddress.balance, INITIAL_BALANCE);
        assertEq(token.balanceOf(dstAddress), 1);
    }

    function testSendCallDataWithNativeTokenSuccess() public {
        uint128 dstGasLimit = 500_000;
        uint128 dstMsgValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            MessageType.ATOMIC,
            dstEid,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            MessageType.ATOMIC,
            dstEid,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(dstAddress.balance, INITIAL_BALANCE + dstMsgValue);
        assertEq(token.balanceOf(dstAddress), 1);
    }

    /// -----------------------------------------------------------------------
    /// State-change internal/private functions
    /// -----------------------------------------------------------------------

    //  ==========  _lzReceive  ==========

    // struct Origin {
    //     uint32 srcEid;
    //     bytes32 sender;
    //     uint64 nonce;
    // }

    function testLzReceiveInternalWithoutPayloadSuccess() public {
        fixture.lzReceiveInternal(
            Origin({ srcEid: srcEid, sender: addressToBytes32(address(srcOmniCall)), nonce: 0 }),
            bytes32(0),
            "",
            address(0),
            ""
        );
    }

    function testLzReceiveInternalWithPayloadSuccess() public {
        bytes memory payload = fixture.encode(
            MessageType.ATOMIC,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(address(0), 0)
        );

        fixture.lzReceiveInternal(
            Origin({ srcEid: srcEid, sender: addressToBytes32(address(srcOmniCall)), nonce: 0 }),
            bytes32(0),
            payload,
            address(0),
            ""
        );

        assertEq(token.balanceOf(dstAddress), 1);
    }

    function testLzReceiveInternalRevertsIfPayloadDoesNotDecode() public {
        bytes memory payload = fixture.encode(
            MessageType.ATOMIC,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(address(0), 0)
        );

        payload[0] = 0;

        vm.prank(srcAddress);
        vm.expectRevert(OmniCallMsgCodecLib.LZ_OmniCallMsgCodecLib__InvalidMessageType.selector);
        fixture.lzReceiveInternal(
            Origin({ srcEid: srcEid, sender: addressToBytes32(address(srcOmniCall)), nonce: 0 }),
            bytes32(0),
            payload,
            address(0),
            ""
        );
    }

    //  ==========  _call  ==========

    function testCallInternalSuccess() public {
        (bool success, bytes memory returnData) = fixture.callInternal(
            address(token),
            uint256(0),
            abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)
        );

        assertTrue(success);
        assertEq(returnData, "");
        assertEq(token.balanceOf(dstAddress), 1);
    }

    function testCallInternalRevertsIfCallFails() public {
        vm.expectRevert();
        fixture.callInternal(address(token), 0, abi.encodeWithSignature("burn(uint256)", 1));
    }

    /// -----------------------------------------------------------------------
    /// View public/external functions
    /// -----------------------------------------------------------------------

    //  ==========  quote  ==========

    function testQuoteSuccess() public {
        uint128 dstGasLimit = 500_000;
        uint128 dstMsgValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            MessageType.NON_ATOMIC,
            dstEid,
            Call(address(0), 0, ""),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        assertTrue(fee.nativeFee > dstMsgValue);
        assertEq(fee.lzTokenFee, 0);
    }

    /// -----------------------------------------------------------------------
    /// View internal/private functions
    /// -----------------------------------------------------------------------

    //  ==========  _quoteWithOptions  ==========

    function testQuoteWithOptionsNoMsgValueSuccess() public {
        uint128 dstGasLimit = 500_000;
        uint128 dstMsgValue = 0;

        (MessagingFee memory fee, bytes memory options) = fixture.quoteWithOptionsInternal(
            MessageType.NON_ATOMIC,
            dstEid,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        assertTrue(fee.nativeFee > 0);
        assertEq(fee.lzTokenFee, 0);
        assertTrue(options.length > 0);
    }

    function testQuoteWithOptionsWithMsgValueSuccess() public {
        uint128 dstGasLimit = 500_000;
        uint128 dstMsgValue = 0.1 ether;

        (MessagingFee memory fee, bytes memory options) = fixture.quoteWithOptionsInternal(
            MessageType.NON_ATOMIC,
            dstEid,
            Call(address(token), 0, abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1)),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        assertTrue(fee.nativeFee > dstMsgValue);
        assertEq(fee.lzTokenFee, 0);
        assertTrue(options.length > 0);
    }

    function testQuoteWithOptionsRevertsIfZeroGasLimit() public {
        vm.expectRevert(OmniCall.LZ_OmniCall__ZeroGasLimit.selector);
        fixture.quoteWithOptionsInternal(
            MessageType.NON_ATOMIC,
            dstEid,
            Call(address(0), 0, ""),
            Transfer(dstAddress, 0),
            0
        );
    }

    /// -----------------------------------------------------------------------
    /// Miscellaneous
    /// -----------------------------------------------------------------------

    function testRevertsIfMaxMessageLengthExceeded() public {
        bytes memory payload = abi.encodePacked(
            uint8(OmniCallMsgCodecLib.CALL_AND_TRANSFER_TYPE),
            address(token),
            uint128(0),
            abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1),
            dstAddress,
            uint128(0)
        );

        while (payload.length <= 10_000) {
            payload = abi.encode(payload, uint256(0));
        }

        vm.expectRevert();
        fixture.sendAlternative(dstEid, payload);
    }
}
