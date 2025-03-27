// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { console } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { EndpointV2 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

//  ==========  Internal imports    ==========

import { OmniCall, MessagingFee, MessagingReceipt, Origin } from "../../contracts/OmniCall.sol";
import { OmniCallMsgCodecLib, Call, Transfer } from "../../contracts/OmniCallMsgCodecLib.sol";
import { ERC20Mock } from "./ERC20Mock.sol";
import { OmniCallFixture } from "./OmniCallFixture.sol";
import { TestHelperOz5WithRevertAssertions } from "./TestHelperOz5WithRevertAssertions.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title Generic omnichain proxy test.
 * @author LayerZeroLabs (@EWCunha).
 */
contract OmniCallTest is TestHelperOz5WithRevertAssertions {
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

    function testSendNativeTokenNonAtomicSuccess() public {
        uint128 dstGasLimit = 50_000;

        // Call
        address callTarget = address(0);
        uint128 callValue = 0;
        bytes memory callData = "";

        // Transfer
        address transferTo = dstAddress;
        uint128 transferValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(transferTo.balance, INITIAL_BALANCE + transferValue);
    }

    function testSendCalldataNonAtomicSuccess() public {
        uint128 dstGasLimit = 500_000;

        // Call
        address callTarget = address(token);
        uint128 callValue = 0;
        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1);

        // Transfer
        address transferTo = address(0);
        uint128 transferValue = 0;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(token.balanceOf(dstAddress), 1);
    }

    function testSendNativeTokenAndCalldataNonAtomicSuccess() public {
        uint128 dstGasLimit = 500_000;

        // Call
        address callTarget = address(token);
        uint128 callValue = 0;
        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1);

        // Transfer
        address transferTo = dstAddress;
        uint128 transferValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(transferTo.balance, INITIAL_BALANCE + transferValue);
        assertEq(token.balanceOf(dstAddress), 1);
    }

    function testSendNativeTokenAndCalldataNonAtomicRevertsIfCallFails() public {
        uint128 dstGasLimit = 500_000;

        // Call
        address callTarget = address(token);
        uint128 callValue = 0;
        bytes memory callData = abi.encodeWithSignature("minta(address,uint256)", dstAddress, 1);

        // Transfer
        address transferTo = dstAddress;
        uint128 transferValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        verifyPacketsWithReceiveRevertAssertion(dstEid, addressToBytes32(address(dstOmniCall)), bytes("EvmError"));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(transferTo.balance, INITIAL_BALANCE + transferValue);
        assertEq(token.balanceOf(dstAddress), 0);
    }

    function testSendNativeTokenAtomicSuccess() public {
        uint128 dstGasLimit = 500_000;

        // Call
        address callTarget = address(0);
        uint128 callValue = 0;
        bytes memory callData = "";

        // Transfer
        address transferTo = dstAddress;
        uint128 transferValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(dstAddress.balance, INITIAL_BALANCE + transferValue);
    }

    function testSendCalldataAtomicSuccess() public {
        uint128 dstGasLimit = 500_000;

        // Call
        address callTarget = address(token);
        uint128 callValue = 0;
        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1);

        // Transfer
        address transferTo = address(0);
        uint128 transferValue = 0;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
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

    function testSendCallDataWithNativeTokenAtomicSuccess() public {
        uint128 dstGasLimit = 500_000;

        // Call
        address callTarget = address(token);
        uint128 callValue = 0;
        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", dstAddress, 1);

        // Transfer
        address transferTo = dstAddress;
        uint128 transferValue = 0.1 ether;

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(callTarget, callValue, callData),
            Transfer(transferTo, transferValue),
            dstGasLimit
        );

        verifyPackets(dstEid, addressToBytes32(address(dstOmniCall)));

        assertNotEq(receipt.guid, bytes32(0));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertEq(receipt.nonce, 1);
        assertEq(srcAddress.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(transferTo.balance, INITIAL_BALANCE + transferValue);
        assertEq(token.balanceOf(dstAddress), 1);
    }

    function testSendCalldataMaliciousRevertsIfTargetOrToIsEndpoint() public {
        uint128 dstGasLimit = 500_000;
        uint128 dstMsgValue = 0;

        EndpointV2 dstEndpoint = EndpointV2(endpoints[dstEid]);
        address blockedLib = dstEndpoint.blockedLibrary();

        MessagingFee memory fee = srcOmniCall.quote(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(
                address(endpoints[dstEid]),
                0,
                abi.encodeWithSignature("setSendLibrary(address,uint32,address)", dstOmniCall, srcEid, blockedLib)
            ),
            Transfer(address(0), dstMsgValue),
            dstGasLimit
        );

        vm.prank(srcAddress);
        MessagingReceipt memory receipt = srcOmniCall.send{ value: fee.nativeFee }(
            OmniCallMsgCodecLib.ATOMIC_TYPE,
            dstEid,
            Call(
                address(endpoints[dstEid]),
                0,
                abi.encodeWithSignature("setSendLibrary(address,uint32,address)", dstOmniCall, srcEid, blockedLib)
            ),
            Transfer(dstAddress, dstMsgValue),
            dstGasLimit
        );

        verifyPacketsWithReceiveRevertAssertion(
            dstEid,
            addressToBytes32(address(dstOmniCall)),
            abi.encodeWithSelector(OmniCall.LZ_OmniCall__InvalidTarget.selector)
        );
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
            OmniCallMsgCodecLib.ATOMIC_TYPE,
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
            OmniCallMsgCodecLib.ATOMIC_TYPE,
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
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
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
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
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
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
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
            OmniCallMsgCodecLib.NON_ATOMIC_TYPE,
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
