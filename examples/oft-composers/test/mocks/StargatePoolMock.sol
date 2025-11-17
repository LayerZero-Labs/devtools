// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { MessagingFee, MessagingReceipt, OFTReceipt, SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

/**
 * @dev Minimal mock that exposes the pieces of the Stargate/OFT contract the composer interacts with.
 *      It records every `send` invocation so tests can assert refund behaviour without needing a full OFT.
 */
contract StargatePoolMock {
    ILayerZeroEndpointV2 private immutable _endpoint;
    address private immutable _token;

    uint32 public lastRefundDstEid;
    bytes32 public lastRefundTo;
    uint256 public lastRefundAmount;
    address public lastRefundAddress;
    uint256 public lastRefundMsgValue;
    uint256 public refundCallCount;

    event MockSend(
        address indexed caller,
        uint32 dstEid,
        bytes32 to,
        uint256 amountLD,
        address refundAddress,
        uint256 msgValue
    );

    constructor(address endpoint_, address token_) {
        _endpoint = ILayerZeroEndpointV2(endpoint_);
        _token = token_;
    }

    function endpoint() external view returns (ILayerZeroEndpointV2) {
        return _endpoint;
    }

    function token() external view returns (address) {
        return _token;
    }

    function send(
        SendParam calldata _sendParam,
        MessagingFee calldata _fee,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory receipt, OFTReceipt memory oftReceipt) {
        lastRefundDstEid = _sendParam.dstEid;
        lastRefundTo = _sendParam.to;
        lastRefundAmount = _sendParam.amountLD;
        lastRefundAddress = _refundAddress;
        lastRefundMsgValue = msg.value;
        refundCallCount++;

        emit MockSend(msg.sender, _sendParam.dstEid, _sendParam.to, _sendParam.amountLD, _refundAddress, msg.value);

        receipt = MessagingReceipt({ guid: bytes32(0), nonce: 0, fee: _fee });
        oftReceipt = OFTReceipt({ amountSentLD: _sendParam.amountLD, amountReceivedLD: _sendParam.amountLD });
    }
}
