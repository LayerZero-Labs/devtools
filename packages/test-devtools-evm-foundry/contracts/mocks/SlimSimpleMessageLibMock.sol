// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.22;

import { IMessageLib, MessageLibType } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLib.sol";
import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { MessagingFee, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";

/**
 * @title SlimSimpleMessageLibMock
 * @notice Ultra-simple message library mock for testing - no protocol logic
 * @dev Just passes messages through without validation or complex processing
 */
contract SlimSimpleMessageLibMock is IMessageLib {
    using PacketV1Codec for bytes;

    address public immutable endpoint;
    address public immutable testHelper;
    uint32 public immutable localEid;

    /**
     * @notice Creates a new message library mock
     * @param _testHelper The test helper contract address for packet scheduling
     * @param _endpoint The endpoint contract address that will call this library
     */
    constructor(address _testHelper, address _endpoint) {
        testHelper = _testHelper;
        endpoint = _endpoint;
        localEid = 1; // Default for testing
    }

    /**
     * @notice Checks if contract supports a specific interface
     * @param interfaceId The interface identifier to check
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public pure virtual returns (bool) {
        return interfaceId == type(IMessageLib).interfaceId;
    }

    /**
     * @notice Forward packet to test helper for scheduling
     * @dev Encodes packet and schedules it via test helper, returns dynamic fee
     * 
     * @param _packet The packet to send
     * @param _options Executor options for packet delivery
     * @param _payInLzToken Whether to pay fees in LZ token
     * 
     * @return fee The calculated messaging fee
     * @return encodedPacket The encoded packet data
     */
    function send(
        Packet calldata _packet,
        bytes memory _options,
        bool _payInLzToken
    ) external virtual returns (MessagingFee memory fee, bytes memory encodedPacket) {
        require(msg.sender == endpoint, "SimpleMessageLibMock: only endpoint");
        
        // Special handling for DEFAULT_CHANNEL_ID (read operations)
        if (_packet.dstEid == 4294967295) { // DEFAULT_CHANNEL_ID
            // For read operations, we just schedule the packet normally
            // The test helper will handle the read-specific logic
            encodedPacket = PacketV1Codec.encode(_packet);
            
            // Schedule packet in test helper
            (bool success,) = testHelper.call(
                abi.encodeWithSignature("schedulePacket(bytes,bytes)", encodedPacket, _options)
            );
            require(success, "SimpleMessageLibMock: failed to schedule packet");
            
            // Return a simple fee for read operations
            uint256 totalFee = 0.001 ether; // Fixed fee for read operations
            
            if (_payInLzToken) {
                fee = MessagingFee({ nativeFee: 0, lzTokenFee: totalFee });
            } else {
                fee = MessagingFee({ nativeFee: totalFee, lzTokenFee: 0 });
            }
            return (fee, encodedPacket);
        }
        
        // Normal message handling
        encodedPacket = PacketV1Codec.encode(_packet);
        
        // Schedule packet in test helper
        (bool success,) = testHelper.call(
            abi.encodeWithSignature("schedulePacket(bytes,bytes)", encodedPacket, _options)
        );
        require(success, "SimpleMessageLibMock: failed to schedule packet");
        
        // Calculate fee same as quote function
        uint256 baseFee = 0.001 ether;
        uint256 perByteCost = 0.000001 ether;
        uint256 dstMultiplier = uint256(_packet.dstEid) * 0.0001 ether / 10000;
        uint256 totalFee = baseFee + (_packet.message.length * perByteCost) + dstMultiplier;
        
        // Include options length as well (simulating executor gas costs)
        if (_options.length > 0) {
            totalFee += _options.length * perByteCost;
        }
        
        if (_payInLzToken) {
            fee = MessagingFee({ nativeFee: 0, lzTokenFee: totalFee });
        } else {
            fee = MessagingFee({ nativeFee: totalFee, lzTokenFee: 0 });
        }
        return (fee, encodedPacket);
    }

    /**
     * @notice Return dynamic fees based on packet parameters
     * @dev Calculates fee based on destination, message size, and options
     * 
     * @param _packet The packet to quote fees for
     * @param _options Executor options that affect gas costs
     * @param _payInLzToken Whether fees will be paid in LZ token
     * 
     * @return fee The calculated messaging fee
     */
    function quote(
        Packet calldata _packet,
        bytes calldata _options,
        bool _payInLzToken
    ) external pure virtual returns (MessagingFee memory fee) {
        // Base fee + per-byte cost + destination multiplier
        uint256 baseFee = 0.001 ether;
        uint256 perByteCost = 0.000001 ether;
        uint256 dstMultiplier = uint256(_packet.dstEid) * 0.0001 ether / 10000; // Normalize by dividing by 10000
        
        // Include message length in fee calculation
        uint256 totalFee = baseFee + (_packet.message.length * perByteCost) + dstMultiplier;
        
        // Include options length as well (simulating executor gas costs)
        if (_options.length > 0) {
            totalFee += _options.length * perByteCost;
        }
        
        // If paying in LZ token, put fee in lzTokenFee instead of nativeFee
        if (_payInLzToken) {
            fee = MessagingFee({ nativeFee: 0, lzTokenFee: totalFee });
        } else {
            fee = MessagingFee({ nativeFee: totalFee, lzTokenFee: 0 });
        }
    }

    /**
     * @notice Simple validation - packets are always valid in testing
     * @dev No-op function for test environment
     * @param _packet The packet to validate (unused)
     */
    function validatePacket(bytes calldata _packet) external pure virtual {
        // No-op - packets are always valid in testing
    }

    // Required interface functions with minimal implementation

    /**
     * @notice Returns the message library type
     * @return Always returns MessageLibType.Send
     */
    function messageLibType() external pure virtual returns (MessageLibType) {
        return MessageLibType.Send;
    }

    /**
     * @notice Returns the library version
     * @return major Always 0 for test mock
     * @return minor Always 0 for test mock
     * @return endpointVersion Always 0 for test mock
     */
    function version() external pure virtual returns (uint64 major, uint8 minor, uint8 endpointVersion) {
        return (0, 0, 0);
    }

    /**
     * @notice Checks if an endpoint ID is supported
     * @param _eid The endpoint ID to check (unused)
     * @return Always returns true in test environment
     */
    function isSupportedEid(uint32 _eid) external pure virtual returns (bool) {
        return true;
    }

    /**
     * @notice Set configuration for an OApp
     * @dev No-op in test environment
     * @param _oapp The OApp address (unused)
     * @param _params Configuration parameters (unused)
     */
    function setConfig(address _oapp, SetConfigParam[] calldata _params) external pure virtual {
        // No-op for testing
    }

    /**
     * @notice Get configuration for an OApp
     * @param _eid The endpoint ID (unused)
     * @param _oapp The OApp address (unused)
     * @param _configType The configuration type (unused)
     * @return Always returns empty bytes in test environment
     */
    function getConfig(uint32 _eid, address _oapp, uint32 _configType) external pure virtual returns (bytes memory) {
        return "";
    }

    // No treasury functionality needed for testing

    /**
     * @notice Withdraw native fees from library
     * @dev No-op in test environment
     * @param _to Recipient address (unused)
     * @param _amount Amount to withdraw (unused)
     */
    function withdrawFee(address _to, uint256 _amount) external pure virtual {
        // No-op
    }

    /**
     * @notice Withdraw LZ token fees from library
     * @dev No-op in test environment
     * @param _to Recipient address (unused)
     * @param _amount Amount to withdraw (unused)
     */
    function withdrawLzTokenFee(address _to, uint256 _amount) external pure virtual {
        // No-op
    }
}
