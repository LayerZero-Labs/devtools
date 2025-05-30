// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

//  ==========  External imports    ==========

import { Test } from "forge-std/Test.sol";
import { BytesLib } from "solidity-bytes-utils/contracts/BytesLib.sol";

//  ==========  Internal imports    ==========

import { OmniCallMsgCodecLib } from "../../contracts/OmniCallMsgCodecLib.sol";
import { OmniCallMsgCodecLibFixture, Call, Transfer } from "./OmniCallMsgCodecLibFixture.sol";

/// -----------------------------------------------------------------------
/// Contract
/// -----------------------------------------------------------------------

/**
 * @title OmniCallMsgCodecLib test.
 * @author LayerZeroLabs (@EWCunha).
 */
contract OmniCallMsgCodecLibTest is Test {
    OmniCallMsgCodecLibFixture public fixture;

    /// -----------------------------------------------------------------------
    /// Set-up
    /// -----------------------------------------------------------------------

    function setUp() public {
        fixture = new OmniCallMsgCodecLibFixture();
    }

    //  ==========  encode  ==========

    function testEncodeCallTypeSuccess() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        assertTrue(fixture.isCallType(encoded));
    }

    function testEncodeCallAndTransferTypeSuccess() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 1)
        );
        assertTrue(fixture.isCallAndTransferType(encoded));
    }

    function testEncodeEmptyData() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.TRANSFER_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        assertTrue(encoded.length == 0);
    }

    //  ==========  decode  ==========

    function testDecodeCallTypeSuccess() public {
        address callTarget = makeAddr("callTarget");
        uint128 callValue = 1;
        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", callTarget, 1);

        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(callTarget, callValue, callData),
            Transfer(address(0), 0)
        );
        (address to, uint128 transferValue, address target, uint128 value, bytes memory data) = fixture.decode(encoded);
        assertEq(to, address(0));
        assertEq(transferValue, 0);
        assertEq(target, callTarget);
        assertEq(value, callValue);
        assertEq(data, callData);
    }

    function testDecodeCallAndTransferTypeSuccess() public {
        address callTarget = makeAddr("callTarget");
        uint128 callValue = 1;
        bytes memory callData = abi.encodeWithSignature("mint(address,uint256)", callTarget, 1);

        address transferTarget = makeAddr("transferTarget");
        uint128 transferValue = 1;

        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(callTarget, callValue, callData),
            Transfer(transferTarget, transferValue)
        );
        (address to, uint128 valueTransfer, address target, uint128 valueCall, bytes memory data) = fixture.decode(
            encoded
        );
        assertEq(to, transferTarget);
        assertEq(valueTransfer, transferValue);
        assertEq(target, callTarget);
        assertEq(valueCall, callValue);
        assertEq(data, callData);
    }

    function testDecodeRevertsIfInvalidMessageType() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        encoded[0] = 0;
        vm.expectRevert(OmniCallMsgCodecLib.LZ_OmniCallMsgCodecLib__InvalidMessageType.selector);
        fixture.decode(encoded);
    }

    function testDecodeCallTypeRevertsIfInvalidLength() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        encoded = BytesLib.slice(encoded, 0, encoded.length - 5);

        assertEq(uint8(encoded[0]), OmniCallMsgCodecLib.CALL_TYPE);
        vm.expectRevert(
            abi.encodeWithSelector(
                OmniCallMsgCodecLib.LZ_OmniCallMsgCodecLib__InvalidDataLength.selector,
                OmniCallMsgCodecLib.CALL_TYPE,
                encoded.length
            )
        );
        fixture.decode(encoded);
    }

    function testDecodeCallAndTransferTypeRevertsIfInvalidLength() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 1)
        );
        encoded = BytesLib.slice(encoded, 0, encoded.length - 5);

        assertEq(uint8(encoded[0]), OmniCallMsgCodecLib.CALL_AND_TRANSFER_TYPE);
        vm.expectRevert(
            abi.encodeWithSelector(
                OmniCallMsgCodecLib.LZ_OmniCallMsgCodecLib__InvalidDataLength.selector,
                OmniCallMsgCodecLib.CALL_AND_TRANSFER_TYPE,
                encoded.length
            )
        );
        fixture.decode(encoded);
    }

    //  ==========  isCallType  ==========

    function testIsCallTypeSuccess() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        assertTrue(fixture.isCallType(encoded));
    }

    function testIsCallTypeUnsuccessInvalidMessageType() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 1)
        );
        assertFalse(fixture.isCallType(encoded));
    }

    function testIsCallTypeUnsuccessInvalidLength() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        encoded = BytesLib.slice(encoded, 0, encoded.length - 5);
        assertFalse(fixture.isCallType(encoded));
    }

    //  ==========  isCallAndTransferType  ==========

    function testIsCallAndTransferTypeSuccess() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 1)
        );
        assertTrue(fixture.isCallAndTransferType(encoded));
    }

    function testIsCallAndTransferTypeUnsuccessInvalidMessageType() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 0)
        );
        assertFalse(fixture.isCallAndTransferType(encoded));
    }

    function testIsCallAndTransferTypeUnsuccessInvalidLength() public {
        bytes memory encoded = fixture.encode(
            OmniCallMsgCodecLib.CALL_TYPE,
            Call(address(0), 0, ""),
            Transfer(address(0), 1)
        );
        encoded = BytesLib.slice(encoded, 0, encoded.length - 5);
        assertFalse(fixture.isCallAndTransferType(encoded));
    }
}
