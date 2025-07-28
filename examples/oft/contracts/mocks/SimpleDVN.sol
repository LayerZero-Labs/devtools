// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IReceiveUlnE2 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/interfaces/IReceiveUlnE2.sol";

// A message on the destination chain has to go through three steps:
// 1. verify -> 2. commit -> 3. execute

/**
 * @title SimpleDVN
 * @notice A minimal DVN for manually verifying messages, for development use on testnets. Not for production. Deploy this on the destination chain.
 * @dev We accept sender and receiver as bytes32 to handle arbitrary remote address formats.
 */
contract SimpleDVN is Ownable {
    error InvalidLocalEid(uint32 expected, uint32 got);
    event PayloadVerified(bytes32 indexed guid);
    event PayloadCommitted(bytes32 indexed guid);

    // Version prefix for Packet encoding (mirrors PacketV1Codec but without assumptions about address types)
    uint8 public constant PACKET_VERSION = 1;

    // Local chain EID for this ReceiveUln
    uint32 public immutable localEid;

    // ULN-302 on this chain
    IReceiveUlnE2 public immutable receiveUln;

    /// @param _receiveUln  Address of this chain's deployed ReceiveUln302
    /// @param _localEid    EID of this chain (receive/destination side)
    constructor(address _receiveUln, uint32 _localEid) Ownable(msg.sender) {
        receiveUln = IReceiveUlnE2(_receiveUln);
        localEid = _localEid;
    }

    /**
     * @notice Manually verifies a packet sent to this chain.
     * @dev This is the first function that should be called in the message verification process.
     * @dev Accepts all address fields as bytes32 to support non-EVM senders (e.g. Solana pubkeys).
     * @param _message      Raw message (e.g., v1 OFT send: [PT_SEND || receiver || amountSD])
     * @param _nonce        LayerZero channel nonce
     * @param _srcEid    Source chain EID
     * @param _remoteOApp   Sender address on source chain as bytes32 (no casting)
     * @param _dstEid     Destination chain EID (should match contract’s localEid)
     * @param _localOApp    Receiver address on this chain (standard EVM address)
     */
    function verify(
        bytes calldata _message,
        uint64 _nonce,
        uint32 _srcEid,
        bytes32 _remoteOApp,
        uint32 _dstEid,
        address _localOApp
    ) external onlyOwner {
        // Ensure localEid matches contract's localEid
        if (_dstEid != localEid) {
            revert InvalidLocalEid(localEid, _dstEid);
        }
        // Convert local EVM address to bytes32 for GUID and header
        bytes32 localOAppB32 = bytes32(uint256(uint160(_localOApp)));

        /*
         * 1. Rebuild ULN-302 GUID:
         *    keccak256(_nonce || _srcEid || _remoteOApp || _dstEid || localAppB32)
         * Using bytes32 for _remoteOApp means no assumption on address encoding.
         */
        bytes32 _guid = _encodeGuid(_nonce, _srcEid, _remoteOApp, _dstEid, localOAppB32);

        /*
         * 2. Call ULN verify:
         *    - Header only includes version, nonce, EIDs, and raw bytes32 sender/receiver
         *    - PayloadHash = keccak256(guid || message)
         *    We pass confirmations=1 to finalize immediately once our DVN signs.
         */
        receiveUln.verify(
            _encodeHeader(_nonce, _srcEid, _remoteOApp, _dstEid, localOAppB32),
            _encodePayloadHash(_guid, _message),
            1
        );
        // Emit event for successful verification
        emit PayloadVerified(_guid);
    }

    /**
     * @notice Manually commits a packet for execution.
     * @dev Accepts all address fields as bytes32 to support non-EVM senders (e.g. Solana pubkeys).
     * @param _message      Raw message (e.g., v1 OFT send: [PT_SEND || receiver || amountSD])
     * @param _nonce        LayerZero channel nonce
     * @param _srcEid    Source chain EID
     * @param _remoteOApp   Sender address on source chain as bytes32 (no casting)
     * @param _dstEid     Destination chain EID (should match contract's localEid)
     * @param _localOApp    Receiver address on this chain (standard EVM address)
     */
    function commit(
        bytes calldata _message,
        uint64 _nonce,
        uint32 _srcEid,
        bytes32 _remoteOApp,
        uint32 _dstEid,
        address _localOApp
    ) external onlyOwner {
        // Ensure localEid matches contract's localEid
        if (_dstEid != localEid) {
            revert InvalidLocalEid(localEid, _dstEid);
        }
        // Convert local EVM address to bytes32 for GUID and header
        bytes32 localOAppB32 = bytes32(uint256(uint160(_localOApp)));
        /*
         * 1. Rebuild ULN-302 GUID:
         *    keccak256(_nonce || _srcEid || _remoteOApp || _dstEid || localAppB32)
         * Using bytes32 for _remoteOApp means no assumption on address encoding.
         */
        bytes32 _guid = _encodeGuid(_nonce, _srcEid, _remoteOApp, _dstEid, localOAppB32);

        /*
         * 2. Call ULN commit:
         *    - payloadHeader = nonce || srcEid || sender || dstEid || receiver
         *    - payloadHash = keccak256(guid || message)
         */

        receiveUln.commitVerification(
            _encodeHeader(_nonce, _srcEid, _remoteOApp, _dstEid, localOAppB32),
            _encodePayloadHash(_guid, _message)
        );
        // Emit event for successful commit
        emit PayloadCommitted(_guid);
    }
    /**
     * @dev Encodes packet header.
     * Works on arbitrary bytes32 sender/receiver values.
     */
    function _encodeHeader(
        uint64 _nonce,
        uint32 _srcEid, // _srcEid
        bytes32 _sender,
        uint32 _dstEid, // _dstEid
        bytes32 _receiver
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(PACKET_VERSION, _nonce, _srcEid, _sender, _dstEid, _receiver);
    }

    /**
     * @dev Encodes payload portion (GUID + message) for ULN-302 into a keccak256 hash.
     */
    function _encodePayloadHash(bytes32 _guid, bytes memory _message) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_guid, _message));
    }

    /**
     * @dev Encodes ULN-302 GUID.
     */
    function _encodeGuid(
        uint64 _nonce,
        uint32 _srcEid,
        bytes32 _sender,
        uint32 _dstEid,
        bytes32 _receiver
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_nonce, _srcEid, _sender, _dstEid, _receiver));
    }
}
