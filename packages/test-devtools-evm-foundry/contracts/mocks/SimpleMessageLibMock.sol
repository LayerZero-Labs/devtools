// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.22;

import { IMessageLib, MessageLibType } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLib.sol";
import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { MessagingFee, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";

/**
 * @title SimpleMessageLibMock
 * @notice Ultra-simple message library mock for testing - no protocol logic
 * @dev Just passes messages through without validation or complex processing
 */
contract SimpleMessageLibMock is IMessageLib {
    using PacketV1Codec for bytes;

    address public immutable endpoint;
    address public immutable testHelper;
    uint32 public immutable localEid;

    // Fixed fees for testing
    uint256 public constant NATIVE_FEE = 0.001 ether;
    uint256 public constant LZ_TOKEN_FEE = 0;

    constructor(address _testHelper, address _endpoint) {
        testHelper = _testHelper;
        endpoint = _endpoint;
        localEid = 1; // Default for testing
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == type(IMessageLib).interfaceId;
    }

    // Just forward the packet to test helper for scheduling
    function send(
        Packet calldata _packet,
        bytes memory _options,
        bool /*_payInLzToken*/
    ) external returns (MessagingFee memory fee, bytes memory encodedPacket) {
        require(msg.sender == endpoint, "SimpleMessageLibMock: only endpoint");
        
        encodedPacket = PacketV1Codec.encode(_packet);
        
        // Schedule packet in test helper
        (bool success,) = testHelper.call(
            abi.encodeWithSignature("schedulePacket(bytes,bytes)", encodedPacket, _options)
        );
        require(success, "SimpleMessageLibMock: failed to schedule packet");
        
        fee = MessagingFee(NATIVE_FEE, LZ_TOKEN_FEE);
    }

    // Just return fixed fees
    function quote(
        Packet calldata /*_packet*/,
        bytes calldata /*_options*/,
        bool /*_payInLzToken*/
    ) external pure returns (MessagingFee memory) {
        return MessagingFee(NATIVE_FEE, LZ_TOKEN_FEE);
    }

    // Simple validation - just mark as verified
    function validatePacket(bytes calldata /*_packet*/) external pure {
        // No-op - packets are always valid in testing
    }

    // Required interface functions with minimal implementation
    function messageLibType() external pure returns (MessageLibType) {
        return MessageLibType.Send;
    }

    function version() external pure returns (uint64 major, uint8 minor, uint8 endpointVersion) {
        return (1, 0, 2);
    }

    function isSupportedEid(uint32 /*_eid*/) external pure returns (bool) {
        return true;
    }

    function setConfig(address /*_oapp*/, SetConfigParam[] calldata /*_params*/) external pure {
        // No-op for testing
    }

    function getConfig(uint32 /*_eid*/, address /*_oapp*/, uint32 /*_configType*/) external pure returns (bytes memory) {
        return "";
    }

    // No treasury functionality needed for testing
    function withdrawFee(address /*_to*/, uint256 /*_amount*/) external pure {
        // No-op
    }

    function withdrawLzTokenFee(address /*_to*/, uint256 /*_amount*/) external pure {
        // No-op
    }
}
