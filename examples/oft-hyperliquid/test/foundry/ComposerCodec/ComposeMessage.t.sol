// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { HyperLiquidComposerCodec } from "@layerzerolabs/hyperliquid-composer/contracts/library/HyperLiquidComposerCodec.sol";

import { IHyperLiquidComposerErrors } from "@layerzerolabs/hyperliquid-composer/contracts/interfaces/IHyperLiquidComposerErrors.sol";

import { HyperLiquidComposer } from "@layerzerolabs/hyperliquid-composer/contracts/HyperLiquidComposer.sol";

import { HyperliquidBaseTest } from "@layerzerolabs/hyperliquid-composer/test/HyperliquidBase.t.sol";

import { console } from "forge-std/Test.sol";

contract ComposeMessageTest is HyperliquidBaseTest {
    using HyperLiquidComposerCodec for bytes;

    uint256 public constant DEFAULT_AMOUNT = 1e18;

    function setUp() public override {
        super.setUp();
    }

    function test_validateAndDecodeMessage_EncodingVariants(address _receiver, bool _useEncodePacked) public view {
        vm.assume(_receiver != address(0));

        bytes memory encodedReceiver = _useEncodePacked ? abi.encodePacked(_receiver) : abi.encode(_receiver);
        bytes memory encodedMessage = abi.encode(1 ether, encodedReceiver);

        bytes memory message = _createMessage(encodedMessage, DEFAULT_AMOUNT, "");

        (uint256 _minMsgValue, address decodedReceiver, uint256 decodedAmount) = this.validateAndDecodeMessage(message);
        assertEq(_minMsgValue, 1 ether);
        assertEq(decodedReceiver, _receiver);
        assertEq(decodedAmount, DEFAULT_AMOUNT);
    }

    function _createMessage(
        bytes memory _receiver,
        uint256 _amount,
        bytes memory _noise
    ) internal view returns (bytes memory) {
        bytes memory payload = bytes.concat(addressToBytes32(userA), _receiver, _noise);
        return OFTComposeMsgCodec.encode(0, 0, _amount, payload);
    }

    function validateAndDecodeMessage(
        bytes calldata _message
    ) public view returns (uint256 minMsgValue, address receiver, uint256 amountLD) {
        bytes memory maybeReceiver = OFTComposeMsgCodec.composeMsg(_message);
        bytes32 senderBytes32 = OFTComposeMsgCodec.composeFrom(_message);

        amountLD = OFTComposeMsgCodec.amountLD(_message);
        (minMsgValue, receiver) = hyperLiquidComposer.validate_msg_or_refund(maybeReceiver, senderBytes32, amountLD);
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
