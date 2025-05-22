// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IReceiveUlnE2 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/interfaces/IReceiveUlnE2.sol";
import { IUltraLightNode301 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/uln301/interfaces/IUltraLightNode301.sol";

/**
 * @title RescueDVN
 * @notice A minimal DVN for reversing stuck messages, such as OFT transfers.
 * @dev We accept sender and receiver as bytes32 to handle arbitrary remote address formats.
 */
contract RescueDVN is Ownable {
    // Version prefix for Packet encoding (mirrors PacketV1Codec but without assumptions about address types)
    uint8 public constant PACKET_VERSION = 1;

    // Local chain EID for this ReceiveUln
    uint32 public immutable localEid;

    // ULN-301 on this chain
    IReceiveUlnE2 public immutable verifyUln;
    IUltraLightNode301 public immutable commitUln;

    /// @param _receiveUln  Address of deployed ReceiveUlnE2
    /// @param _localEid    EID of this chain (receive side)
    constructor(address _receiveUln, uint32 _localEid) {
        verifyUln = IReceiveUlnE2(_receiveUln);
        commitUln = IUltraLightNode301(_receiveUln);
        localEid = _localEid;
    }

    /**
     * @notice Manually proves a stuck OFT send so mint can execute.
     * @dev Accepts all address fields as bytes32 to support non-EVM senders (e.g. Solana pubkeys).
     * @param _message      Raw message (e.g., v1 OFT send: [PT_SEND || receiver || amountSD])
     * @param _nonce        LayerZero channel nonce
     * @param _remoteEid    Source chain EID
     * @param _remoteOApp   Sender address on source chain as bytes32 (no casting)
     * @param _localEid     Destination chain EID (should match contract’s localEid)
     * @param _localOApp    Receiver address on this chain (standard EVM address)
     */
    function verifyStuckSend(
        bytes memory _message,
        uint64 _nonce,
        uint32 _remoteEid,
        bytes32 _remoteOApp,
        uint32 _localEid,
        address _localOApp
    ) external onlyOwner {
        // Convert local EVM address to bytes32 for GUID and header
        bytes32 localOAppB32 = bytes32(uint256(uint160(_localOApp)));

        /*
         * 1. Rebuild ULN-301 GUID:
         *    keccak256(_nonce || _remoteEid || _remoteOApp || _localEid || localAppB32)
         * Using bytes32 for _remoteOApp means no assumption on address encoding.
         */
        bytes32 _guid = _encodeGuid(_nonce, _remoteEid, _remoteOApp, _localEid, localOAppB32);

        /*
         * 2. Call ULN verify:
         *    - Header only includes version, nonce, EIDs, and raw bytes32 sender/receiver
         *    - PayloadHash = keccak256(guid || message)
         *    We pass confirmations=1 to finalize immediately once our DVN signs.
         */
        verifyUln.verify(
            _encodeHeader(_nonce, _remoteEid, _remoteOApp, _localEid, localOAppB32),
            keccak256(_encodePayload(_guid, _message)),
            1
        );
    }

    function commitStuckSend(
        bytes memory _message,
        uint64 _nonce,
        uint32 _remoteEid,
        bytes32 _remoteOApp,
        uint32 _localEid,
        address _localOApp,
        uint256 _gasLimit
    ) external onlyOwner {
        // Convert local EVM address to bytes32 for GUID and header
        bytes32 localOAppB32 = bytes32(uint256(uint160(_localOApp)));
        /*
         * 1. Rebuild ULN-301 GUID:
         *    keccak256(_nonce || _remoteEid || _remoteOApp || _localEid || localAppB32)
         * Using bytes32 for _remoteOApp means no assumption on address encoding.
         */
        bytes32 _guid = _encodeGuid(_nonce, _remoteEid, _remoteOApp, _localEid, localOAppB32);

        /*
         * 2. Call ULN commit:
         *    - Header only includes version, nonce, EIDs, and raw bytes32 sender/receiver
         *    - PayloadHash = keccak256(guid || message)
         *    We pass gasLimit to specify execution gas on destination
         */
        bytes memory encodedPacket = abi.encodePacked(
            _encodeHeader(_nonce, _remoteEid, _remoteOApp, _localEid, localOAppB32),
            _encodePayload(_guid, _message)
        );
        commitUln.commitVerification(encodedPacket, _gasLimit);
    }
    /**
     * @dev Encodes packet header in the same order ULN-301 expects, without PacketV1Codec.
     * Works on arbitrary bytes32 sender/receiver values.
     */
    function _encodeHeader(
        uint64 _nonce,
        uint32 _srcEid,
        bytes32 _sender,
        uint32 _dstEid,
        bytes32 _receiver
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(PACKET_VERSION, _nonce, _srcEid, _sender, _dstEid, _receiver);
    }

    /**
     * @dev Encodes payload portion (GUID + message) for ULN-301.
     */
    function _encodePayload(bytes32 _guid, bytes memory _message) internal pure returns (bytes memory) {
        return abi.encodePacked(_guid, _message);
    }

    function _encodeGuid(
        uint64 _nonce,
        uint32 _srcEid,
        bytes32 _sender,
        uint32 _dstEid,
        bytes32 _receiver
    ) internal pure returns (bytes32) {
        bytes32 guid = keccak256(abi.encodePacked(_nonce, _srcEid, _sender, _dstEid, _receiver));
        return guid;
    }
}
