// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { MyHyperLiquidOFT } from "./MyHyperLiquidOFT.sol";
import { OFTMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTMsgCodec.sol";

contract WrappedHyperliquidOFT is OApp, OAppOptionsType3 {
    using OFTMsgCodec for bytes;
    using OFTMsgCodec for bytes32;

    address public constant hyperEvmOFT = 0xAd543c6aF375b1001E3b08202b1Eb3e6e608A42F;
    uint256 public constant decimalConversionRate = 10 ** (18 - 6);

    event OFTReceived(bytes32 indexed guid, uint32 srcEid, address toAddress, uint256 amountReceivedLD);

    constructor(address _endpoint, address _delegate) OApp(_endpoint, _delegate) Ownable(_delegate) {}

    /**
     * @notice Sends a message from the source chain to a destination chain.
     * @param _dstEid The endpoint ID of the destination chain.
     * @param _message The message string to be sent.
     * @param _options Additional options for message execution.
     * @dev Encodes the message as bytes and sends it using the `_lzSend` internal function.
     * @return receipt A `MessagingReceipt` struct containing details of the message sent.
     */
    function send(
        uint32 _dstEid,
        string memory _message,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        bytes memory _payload = abi.encode(_message);
        receipt = _lzSend(_dstEid, _payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
    }

    /**
     * @notice Quotes the gas needed to pay for the full omnichain transaction in native gas or ZRO token.
     * @param _dstEid Destination chain's endpoint ID.
     * @param _message The message.
     * @param _options Message execution options (e.g., for sending gas to destination).
     * @param _payInLzToken Whether to return fee in ZRO token.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
    function quote(
        uint32 _dstEid,
        string memory _message,
        bytes memory _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_message);
        fee = _quote(_dstEid, payload, _options, _payInLzToken);
    }

    /**
     * @dev Internal function to handle the receive on the LayerZero endpoint.
     * @param _origin The origin information.
     *  - srcEid: The source chain endpoint ID.
     *  - sender: The sender address from the src chain.
     *  - nonce: The nonce of the LayerZero message.
     * @param _guid The unique identifier for the received LayerZero message.
     * @param _message The encoded message.
     * @dev _executor The address of the executor.
     * @dev _extraData Additional data.
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/, // @dev unused in the default implementation.
        bytes calldata /*_extraData*/ // @dev unused in the default implementation.
    ) internal virtual override {
        // @dev The src sending chain doesnt know the address length on this chain (potentially non-evm)
        // Thus everything is bytes32() encoded in flight.
        address toAddress = _message.sendTo().bytes32ToAddress();

        uint256 amountReceivedLD = _toLD(_message.amountSD());

        // @dev Credit the amountLD to the recipient and return the ACTUAL amount the recipient received in local decimals
        MyHyperLiquidOFT(hyperEvmOFT).mint(toAddress, amountReceivedLD);

        if (_message.isComposed()) {
            // @dev Proprietary composeMsg format for the OFT.
            bytes memory composeMsg = OFTComposeMsgCodec.encode(
                _origin.nonce,
                _origin.srcEid,
                amountReceivedLD,
                _message.composeMsg()
            );

            // @dev Stores the lzCompose payload that will be executed in a separate tx.
            // Standardizes functionality for executing arbitrary contract invocation on some non-evm chains.
            // @dev The off-chain executor will listen and process the msg based on the src-chain-callers compose options passed.
            // @dev The index is used when a OApp needs to compose multiple msgs on lzReceive.
            // For default OFT implementation there is only 1 compose msg per lzReceive, thus its always 0.
            endpoint.sendCompose(toAddress, _guid, 0 /* the index of the composed message*/, composeMsg);
        }

        emit OFTReceived(_guid, _origin.srcEid, toAddress, amountReceivedLD);
    }

    /**
     * @dev Internal function to convert an amount from shared decimals into local decimals.
     * @param _amountSD The amount in shared decimals.
     * @return amountLD The amount in local decimals.
     */
    function _toLD(uint64 _amountSD) internal view virtual returns (uint256 amountLD) {
        return _amountSD * decimalConversionRate;
    }
}
