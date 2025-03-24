// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { HyperLiquidComposerCodec } from "../../contracts/library/HyperLiquidComposerCodec.sol";
import { IHyperLiquidComposerErrors, ErrorMessage } from "../../contracts/interfaces/IHyperLiquidComposerErrors.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { Test, console } from "forge-std/Test.sol";

contract ComposeMessageTest is Test {
    uint256 constant DEFAULT_AMOUNT = 1e18;
    uint256 constant DEFAULT_DECIMAL_DIFF = 12;
    address sender;

    function setUp() public {
        sender = makeAddr("sender");
    }

    function test_validateAndDecodeMessage_EncodingVariants(address receiver, bool useEncodePacked) public view {
        vm.assume(receiver != address(0));

        bytes memory encodedReceiver = useEncodePacked ? abi.encodePacked(receiver) : abi.encode(receiver);

        bytes memory message = _createMessage(encodedReceiver, DEFAULT_AMOUNT, "");

        (address decodedReceiver, uint256 decodedAmount) = this.validateAndDecodeMessage(message);
        assertEq(decodedReceiver, receiver);
        assertEq(decodedAmount, DEFAULT_AMOUNT);
    }

    function test_validateAndDecodeMessage_InvalidLength(
        address receiver,
        bytes memory noise,
        bool useEncodePacked
    ) public {
        vm.assume(receiver != address(0));
        vm.assume(noise.length > 0);

        // When the noise length is 12, abi.encodePacked (20 bytes) + 12 bytes = 32 bytes
        // 32 bytes is the length of the message when we use abi.encode
        // This causes the abi.decode to fail as the 32 byte "address" is not valid
        bool isNoiseLength12 = noise.length != 12;

        bytes memory encodedReceiver = useEncodePacked ? abi.encodePacked(receiver) : abi.encode(receiver);

        bytes memory message = _createMessage(encodedReceiver, DEFAULT_AMOUNT, noise);

        if (isNoiseLength12 && useEncodePacked) {
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
        bytes memory receiver,
        uint256 amount,
        bytes memory extraData
    ) internal view returns (bytes memory) {
        bytes memory payload = abi.encodePacked(addressToBytes32(sender), receiver, extraData);
        return OFTComposeMsgCodec.encode(0, 0, amount, payload);
    }

    function validateAndDecodeMessage(
        bytes calldata message
    ) public pure returns (address _receiver, uint256 _amountLD) {
        (_receiver, _amountLD) = HyperLiquidComposerCodec.validateAndDecodeMessage(message);
    }

    function composeMsg(bytes calldata message) public pure returns (bytes memory) {
        return OFTComposeMsgCodec.composeMsg(message);
    }

    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    function createErrorMessage(address _to, uint256 _amount, bytes memory _reason) public pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                IHyperLiquidComposerErrors.ErrorMsg.selector,
                HyperLiquidComposerCodec.createErrorMessage(_to, _amount, _reason)
            );
    }
}
