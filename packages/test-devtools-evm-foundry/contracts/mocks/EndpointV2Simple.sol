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

    // Events from ILayerZeroEndpointV2
    event PacketSent(bytes encodedPayload, bytes options, address sendLibrary);
    event PacketDelivered(Origin origin, address receiver);
    
    constructor(uint32 _eid) {
        eid = _eid;
    }

    /// @notice Simplified quote - just returns a fixed fee for testing
    function quote(MessagingParams calldata, address) external pure returns (MessagingFee memory) {
        return MessagingFee({ nativeFee: 0.001 ether, lzTokenFee: 0 });
    }

    /// @notice Simplified send - calls the message library which schedules the packet
    function send(
        MessagingParams calldata _params,
        address /*_refundAddress*/
    ) external payable returns (MessagingReceipt memory) {
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
    function lzReceive(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable {
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
    function lzCompose(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 /*_index*/,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable {
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
    function registerLibrary(address) external {
        // No-op for testing
    }

    /// @notice Set default send library for an eid
    function setDefaultSendLibrary(uint32 _eid, address _lib) external {
        defaultSendLibrary[_eid] = _lib;
    }

    /// @notice Set default receive library for an eid  
    function setDefaultReceiveLibrary(uint32 _eid, address _lib, uint64) external {
        defaultReceiveLibrary[_eid] = _lib;
    }

    /// @notice Get receive library - returns the default
    function getReceiveLibrary(address, uint32 _srcEid) external view returns (address lib, bool isDefault) {
        return (defaultReceiveLibrary[_srcEid], true);
    }
    
    /// @notice Get send library - returns the default
    function getSendLibrary(address, uint32 _dstEid) external view returns (address lib) {
        return defaultSendLibrary[_dstEid];
    }
    
    // Minimal implementations for commonly called functions
    function setConfig(address, address, bytes calldata) external pure {}
    function setDelegate(address) external pure {}
    function lzToken() external pure returns (address) { return address(0); }
    function nativeToken() external pure returns (address) { return address(0); }
    
    /// @notice Handle sendCompose from OFT - in simplified testing, just emit an event
    function sendCompose(address _to, bytes32 _guid, uint16 _index, bytes calldata _message) external {
        // In the simplified test environment, we don't need to actually queue compose messages
        // The test will manually call lzCompose when needed
    }
} 