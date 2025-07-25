// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { MyEPV2OFT } from "../MyEPV2OFT.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppReceiver.sol";
import { SendParam } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

/// @title MyEPV2Mock
/// @notice **This contract is an EndpointV2 OFT implementation** and should not be used for new OFT deployments.
/// @dev The name `OFTV2`refers to the V2 implementation of the OFT on **LayerZero EndpointV1** and **not** **LayerZero EndpointV2**.
///      The `solidity-examples` repo is exclusively for EndpointV1 OFT
contract MyEPV2Mock is MyEPV2OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) MyEPV2OFT(_name, _symbol, _lzEndpoint, _delegate) {
        _mint(msg.sender, 10 ether);
    }

    function lzReceiveExternal(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) public payable {
        super._lzReceive(_origin, _guid, _message, _executor, _extraData);
    }

    // Expose internal methods for testing

    function handleV1Message(Origin calldata _origin, bytes32 _guid, bytes calldata _message) public {
        super._handleV1Message(_origin, _guid, _message);
    }

    function handleV2Message(Origin calldata _origin, bytes32 _guid, bytes calldata _message) public {
        super._handleV2Message(_origin, _guid, _message);
    }

    // Helper method to check if a message would be detected as V1
    function isV1Message(bytes calldata _message) public pure returns (bool) {
        bool isV1 = false;

        if (_message.length == 41) {
            // Could be V1 PT_SEND - check if first byte is 0 (PT_SEND)
            isV1 = uint8(_message[0]) == PT_SEND;
        } else if (_message.length >= 81) {
            // Could be V1 PT_SEND_AND_CALL - check if first byte is 1 (PT_SEND_AND_CALL)
            isV1 = uint8(_message[0]) == PT_SEND_AND_CALL;
        }

        return isV1;
    }

    // Expose the LD/SD conversion methods for testing
    function toLD(uint64 _amountSD) public view returns (uint256) {
        return _toLD(_amountSD);
    }

    function toSD(uint256 _amountLD) public view returns (uint64) {
        return _toSD(_amountLD);
    }

    // Expose credit method for testing
    function credit(address _to, uint256 _amountLD, uint32 _srcEid) public returns (uint256) {
        return _credit(_to, _amountLD, _srcEid);
    }

    // Get decimal conversion rate
    function getDecimalConversionRate() public view returns (uint256) {
        return decimalConversionRate;
    }

    // Expose _buildMsgAndOptions for testing
    function buildMsgAndOptions(
        SendParam calldata _sendParam,
        uint256 _amountLD
    ) public view returns (bytes memory message, bytes memory options) {
        return super._buildMsgAndOptions(_sendParam, _amountLD);
    }
}
