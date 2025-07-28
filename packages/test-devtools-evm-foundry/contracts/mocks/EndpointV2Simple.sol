// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.20;

import { ILayerZeroEndpointV2, MessagingFee, MessagingParams, MessagingReceipt, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { ILayerZeroReceiver } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";
import { ILayerZeroComposer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroComposer.sol";
import { ISendLib, Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { GUID } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/GUID.sol";

/**
 * @title EndpointV2Simple
 * @notice Ultra-lightweight endpoint mock for testing OApps without complex protocol logic
 * @dev Minimal implementation - only what's needed for basic OApp testing
 */
contract EndpointV2Simple {
    uint32 public immutable eid;
    
    // Minimal state
    mapping(address => mapping(uint32 => mapping(bytes32 => uint64))) public outboundNonce;
    mapping(uint32 => address) public defaultSendLibrary;
    mapping(uint32 => address) public defaultReceiveLibrary;

    /// @notice Emitted when a packet is sent through the endpoint
    /// @param encodedPayload The encoded packet payload
    /// @param options The executor options
    /// @param sendLibrary The address of the send library used
    event PacketSent(bytes encodedPayload, bytes options, address sendLibrary);
    
    /// @notice Emitted when a packet is successfully delivered to a receiver
    /// @param origin The origin information of the packet
    /// @param receiver The address that received the packet
    event PacketDelivered(Origin origin, address receiver);
    
    /**
     * @notice Creates a new endpoint with the specified ID
     * @param _eid The endpoint ID for this instance
     */
    constructor(uint32 _eid) {
        eid = _eid;
    }

    /// @notice Simplified quote - calculates fee based on destination and message size
    /// @dev Returns dynamic fees based on message length, destination, and payment method
    /// 
    /// @param _params Messaging parameters containing dstEid, message, and payInLzToken
    /// @return fee The calculated messaging fee
    function quote(MessagingParams calldata _params, address) external pure virtual returns (MessagingFee memory fee) {
        // Base fee + per-byte cost + destination multiplier
        uint256 baseFee = 0.001 ether;
        uint256 perByteCost = 0.000001 ether;
        uint256 dstMultiplier = uint256(_params.dstEid) * 0.0001 ether / 10000; // Normalize by dividing by 10000
        
        uint256 totalFee = baseFee + (_params.message.length * perByteCost) + dstMultiplier;
        
        // Include options length as well (simulating executor gas costs)
        if (_params.options.length > 0) {
            totalFee += _params.options.length * perByteCost;
        }
        
        // If paying in LZ token, put fee in lzTokenFee instead of nativeFee
        if (_params.payInLzToken) {
            fee = MessagingFee({ nativeFee: 0, lzTokenFee: totalFee });
        } else {
            fee = MessagingFee({ nativeFee: totalFee, lzTokenFee: 0 });
        }
    }

    /// @notice Simplified send - calls the message library which schedules the packet
    /// @dev Creates packet, calls send library, and returns receipt
    /// 
    /// @param _params The messaging parameters including destination, receiver, and message
    /// 
    /// @return receipt The messaging receipt containing GUID, nonce, and fee
    function send(
        MessagingParams calldata _params,
        address /*_refundAddress*/
    ) external payable virtual returns (MessagingReceipt memory) {
        // Get and increment nonce
        uint64 nonce = ++outboundNonce[msg.sender][_params.dstEid][_params.receiver];
        
        // Generate GUID
        bytes32 guid = GUID.generate(nonce, eid, msg.sender, _params.dstEid, _params.receiver);
        
        // Create packet
        Packet memory packet = Packet({
            nonce: nonce,
            srcEid: eid,
            sender: msg.sender,
            dstEid: _params.dstEid,
            receiver: _params.receiver,
            guid: guid,
            message: _params.message
        });
        
        // Get send library and call it
        address sendLib = defaultSendLibrary[_params.dstEid];
        require(sendLib != address(0), "EndpointV2Simple: no send library");
        
        (MessagingFee memory fee, bytes memory encodedPacket) = ISendLib(sendLib).send(
            packet,
            _params.options,
            _params.payInLzToken
        );
        
        // Emit event
        emit PacketSent(encodedPacket, _params.options, sendLib);
        
        // Return receipt
        return MessagingReceipt({
            guid: guid,
            nonce: nonce,
            fee: fee
        });
    }

    /// @notice Direct lzReceive for testing - calls the OApp's lzReceive with specified gas
    /// @dev Attempts to deliver packet to receiver, silently fails on revert
    /// 
    /// @param _origin The origin information of the packet
    /// @param _receiver The receiver contract address
    /// @param _guid The packet GUID
    /// @param _message The message payload
    /// @param _extraData Additional data for the receiver
    function lzReceive(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable virtual {
        // Call the OApp's lzReceive function
        try ILayerZeroReceiver(_receiver).lzReceive{ value: msg.value, gas: gasleft() }(
            _origin,
            _guid,
            _message,
            msg.sender,
            _extraData
        ) {
            emit PacketDelivered(_origin, _receiver);
        } catch {
            // Silently fail in test environment
        }
    }

    /// @notice Direct lzCompose for testing
    /// @dev Attempts to call composer contract, silently fails on revert
    /// 
    /// @param _from The address that initiated the compose
    /// @param _to The composer contract address
    /// @param _guid The packet GUID
    /// @param _message The compose message payload
    /// @param _extraData Additional data for the composer
    function lzCompose(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 /*_index*/,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable virtual {
        // Call the composer's lzCompose function
        try ILayerZeroComposer(_to).lzCompose{ value: msg.value, gas: gasleft() }(
            _from,
            _guid,
            _message,
            msg.sender,
            _extraData
        ) {
            // Success
        } catch {
            // Silently fail in test environment
        }
    }

    /// @notice Simplified library registration
    /// @dev No-op in test environment
    /// 
    /// @param _library The library address to register (unused)
    function registerLibrary(address _library) external virtual {
        // No-op for testing
    }

    /// @notice Set default send library for an eid
    /// @dev Stores the send library address for the specified destination
    /// 
    /// @param _eid The destination endpoint ID
    /// @param _lib The send library address
    function setDefaultSendLibrary(uint32 _eid, address _lib) external virtual {
        defaultSendLibrary[_eid] = _lib;
    }

    /// @notice Set default receive library for an eid
    /// @dev Stores the receive library address for the specified source
    /// 
    /// @param _eid The source endpoint ID
    /// @param _lib The receive library address
    /// @param _gracePeriod Grace period for library updates (unused)
    function setDefaultReceiveLibrary(uint32 _eid, address _lib, uint64 _gracePeriod) external virtual {
        defaultReceiveLibrary[_eid] = _lib;
    }

    /// @notice Get receive library - returns the default
    /// @dev Always returns the default library as configured
    /// 
    /// @param _oapp The OApp address (unused)
    /// @param _srcEid The source endpoint ID
    /// 
    /// @return lib The receive library address
    /// @return isDefault Always true in this mock
    function getReceiveLibrary(address _oapp, uint32 _srcEid) external view virtual returns (address lib, bool isDefault) {
        return (defaultReceiveLibrary[_srcEid], true);
    }
    
    /// @notice Get send library - returns the default
    /// @dev Always returns the default library as configured
    /// 
    /// @param _sender The sender address (unused)
    /// @param _dstEid The destination endpoint ID
    /// 
    /// @return lib The send library address
    function getSendLibrary(address _sender, uint32 _dstEid) external view virtual returns (address lib) {
        return defaultSendLibrary[_dstEid];
    }
    
    // Minimal implementations for commonly called functions
    
    /// @notice Set configuration for OApp
    /// @dev No-op in test environment
    function setConfig(address _oapp, address _lib, bytes calldata _config) external pure virtual {}
    
    /// @notice Set delegate for OApp
    /// @dev No-op in test environment
    function setDelegate(address _delegate) external pure virtual {}
    
    /// @notice Get LZ token address
    /// @dev Always returns zero address in test environment
    /// @return Always returns address(0)
    function lzToken() external pure virtual returns (address) { return address(0); }
    
    /// @notice Get native token address
    /// @dev Always returns zero address in test environment
    /// @return Always returns address(0)
    function nativeToken() external pure virtual returns (address) { return address(0); }
    
    /// @notice Handle sendCompose from OFT - in simplified testing, just emit an event
    /// @dev No-op in test environment - test will manually call lzCompose when needed
    /// 
    /// @param _to The composer address
    /// @param _guid The packet GUID
    /// @param _index The compose index
    /// @param _message The compose message
    function sendCompose(address _to, bytes32 _guid, uint16 _index, bytes calldata _message) external virtual {
        // In the simplified test environment, we don't need to actually queue compose messages
        // The test will manually call lzCompose when needed
    }
} 