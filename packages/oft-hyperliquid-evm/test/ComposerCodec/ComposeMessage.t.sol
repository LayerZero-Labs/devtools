// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidComposerCodec } from "../../contracts/library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposerCore } from "../../contracts/HyperLiquidComposerCore.sol";
import { IHyperLiquidComposerErrors, ErrorMessagePayload } from "../../contracts/interfaces/IHyperLiquidComposerErrors.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { Test, console } from "forge-std/Test.sol";

contract ComposeMessageTest is Test {
    using HyperLiquidComposerCodec for bytes;

    uint256 public constant DEFAULT_AMOUNT = 1e18;

    HyperLiquidComposerCore public composerCore = new HyperLiquidComposerCore();

    address public sender;

    function setUp() public {
        sender = makeAddr("sender");
    }

    function test_validateAndDecodeMessage_EncodingVariants(address _receiver, bool _useEncodePacked) public view {
        vm.assume(_receiver != address(0));

        bytes memory encodedReceiver = _useEncodePacked ? abi.encodePacked(_receiver) : abi.encode(_receiver);

        bytes memory message = _createMessage(encodedReceiver, DEFAULT_AMOUNT, "");

        (address decodedReceiver, uint256 decodedAmount) = this.validateAndDecodeMessage(message);
        assertEq(decodedReceiver, _receiver);
        assertEq(decodedAmount, DEFAULT_AMOUNT);
    }

    function test_validateAndDecodeMessage_InvalidLength(
        address _receiver,
        bytes memory _noise,
        bool _useEncodePacked
    ) public {
        vm.assume(_receiver != address(0));
        vm.assume(_noise.length > 0);

        // When the noise length is 12, abi.encodePacked (20 bytes) + 12 bytes = 32 bytes
        // 32 bytes is the length of the message when we use abi.encode
        // This causes the abi.decode to fail as the 32 byte "address" is not valid
        bool isNoiseLengthNot12 = _noise.length != 12;

        bytes memory encodedReceiver = _useEncodePacked ? abi.encodePacked(_receiver) : abi.encode(_receiver);

        bytes memory message = _createMessage(encodedReceiver, DEFAULT_AMOUNT, _noise);

        if (isNoiseLengthNot12 && _useEncodePacked) {
            bytes memory expectedRevertMessage = this.composeMsg(message);
            address expectedRevertTo = sender;
            uint256 expectedRevertAmount = DEFAULT_AMOUNT;
            bytes memory expectedRevertReason = abi.encodeWithSelector(
                IHyperLiquidComposerErrors.HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength.selector,
                expectedRevertMessage,
                expectedRevertMessage.length
            );
            vm.expectRevert(createErrorMessage(expectedRevertTo, expectedRevertAmount, expectedRevertReason));
        } else {
            vm.expectRevert();
        }
        this.validateAndDecodeMessage(message);
    }

    function _createMessage(
        bytes memory _receiver,
        uint256 _amount,
        bytes memory _noise
    ) internal view returns (bytes memory) {
        bytes memory payload = bytes.concat(addressToBytes32(sender), _receiver, _noise);
        return OFTComposeMsgCodec.encode(0, 0, _amount, payload);
    }

    function validateAndDecodeMessage(
        bytes calldata _message
    ) public view returns (address _receiver, uint256 _amountLD) {
        bytes memory maybeReceiver = OFTComposeMsgCodec.composeMsg(_message);
        bytes32 senderBytes32 = OFTComposeMsgCodec.composeFrom(_message);

        _amountLD = OFTComposeMsgCodec.amountLD(_message);
        _receiver = composerCore.validate_addresses_or_refund(maybeReceiver, senderBytes32, _amountLD);
    }

    function composeMsg(bytes calldata _message) public pure returns (bytes memory) {
        return OFTComposeMsgCodec.composeMsg(_message);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function createErrorMessage(address _to, uint256 _amount, bytes memory _reason) public pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                IHyperLiquidComposerErrors.ErrorMsg.selector,
                _reason.createErrorMessage(_to, _amount)
            );
    }
}
