// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.22;

import { ILayerZeroEndpointV2, MessagingParams, MessagingReceipt, MessagingFee, ExecutionState } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { ILayerZeroReceiver } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { MessagingContext } from "@layerzerolabs/lz-evm-protocol-v2/contracts/MessagingContext.sol";
import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { OFTMsgCodec } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/libs/OFTMsgCodec.sol";
import { Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppReceiver.sol";
import { Errors } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/Errors.sol";
import { GUID } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/GUID.sol";
import { ExecutorOptions } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/ExecutorOptions.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";
import { IExecutorFeeLib } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutorFeeLib.sol";

contract LZEndpointV2Mock is ILayerZeroEndpointV2, MessagingContext {
    using ExecutorOptions for bytes;
    using OFTMsgCodec for bytes;
    using OFTMsgCodec for bytes32;
    using OFTMsgCodec for address;

    uint8 internal constant _NOT_ENTERED = 1;
    uint8 internal constant _ENTERED = 2;

    uint32 public immutable eid;

    mapping(address => address) public lzEndpointLookup;

    mapping(address receiver => mapping(uint32 srcEid => mapping(bytes32 sender => uint64 nonce)))
        internal lazyInboundNonce;
    mapping(address receiver => mapping(uint32 srcEid => mapping(bytes32 sender => mapping(uint64 inboundNonce => bytes32 payloadHash))))
        public inboundPayloadHash;
    mapping(address sender => mapping(uint32 dstEid => mapping(bytes32 receiver => uint64 nonce))) public outboundNonce;

    // msgToDeliver = [srcChainId][path]
    mapping(uint32 => mapping(address => QueuedPayload[])) public msgsToDeliver;

    RelayerFeeConfig public relayerFeeConfig;
    ProtocolFeeConfig protocolFeeConfig;

    uint public verifierFee;
    struct ProtocolFeeConfig {
        uint zroFee;
        uint nativeBP;
    }

    struct RelayerFeeConfig {
        uint128 dstPriceRatio; // 10^10
        uint128 dstGasPriceInWei;
        uint128 dstNativeAmtCap;
        uint64 baseGas;
        uint64 gasPerByte;
    }

    struct QueuedPayload {
        address dstAddress;
        uint64 nonce;
        bytes payload;
    }

    uint8 internal _receive_entered_state = 1;
    modifier receiveNonReentrant() {
        require(_receive_entered_state == _NOT_ENTERED, "LayerZeroMock: no receive reentrancy");
        _receive_entered_state = _ENTERED;
        _;
        _receive_entered_state = _NOT_ENTERED;
    }

    event ValueTransferFailed(address indexed to, uint indexed quantity);

    constructor(uint32 _eid) {
        eid = _eid;

        // init config
        relayerFeeConfig = RelayerFeeConfig({
            dstPriceRatio: 1e10, // 1:1, same chain, same native coin
            dstGasPriceInWei: 1e10,
            dstNativeAmtCap: 1e19,
            baseGas: 100,
            gasPerByte: 1
        });
        protocolFeeConfig = ProtocolFeeConfig({ zroFee: 1e18, nativeBP: 1000 }); // BP 0.1
        verifierFee = 1e16;
    }

    function send(
        MessagingParams calldata _params,
        address _refundAddress
    ) public payable sendContext(_params.dstEid, msg.sender) returns (MessagingReceipt memory receipt) {
        if (_params.payInLzToken) revert Errors.LzTokenUnavailable();

        address lzEndpoint = lzEndpointLookup[_params.receiver.bytes32ToAddress()];
        require(lzEndpoint != address(0), "LayerZeroMock: destination LayerZero Endpoint not found");

        // get the correct outbound nonce
        uint64 latestNonce = _outbound(msg.sender, _params.dstEid, _params.receiver);

        Packet memory packet = Packet({
            nonce: latestNonce,
            srcEid: eid,
            sender: msg.sender,
            dstEid: _params.dstEid,
            receiver: _params.receiver,
            guid: GUID.generate(latestNonce, eid, msg.sender, _params.dstEid, _params.receiver),
            message: _params.message
        });
        receipt.guid = packet.guid;
        receipt.nonce = packet.nonce;
        receipt.fee = _quote(_params, msg.sender);
        require(msg.value >= receipt.fee.nativeFee, "LayerZeroMock: not enough native for fees");

        // refund if they send too much
        uint amount = msg.value - receipt.fee.nativeFee;
        if (amount > 0) {
            (bool success, ) = _refundAddress.call{ value: amount }("");
            require(success, "LayerZeroMock: failed to refund");
        }

        // Mock the process of receiving msg on dst chain
        // Mock the executor paying the dstNativeAddr the amount of extra native token
        // (uint128 dstNativeAmt, bytes32 dstNativeAddr) = ExecutorOptions.decodeNativeDropOption(_params.options);
        // if (dstNativeAmt > 0) {
        //     (bool success, ) = dstNativeAddr.bytes32ToAddress().call{ value: dstNativeAmt }("");
        //     if (!success) {
        //         emit ValueTransferFailed(dstNativeAddr.bytes32ToAddress(), dstNativeAmt);
        //     }
        // }

        (uint128 gas, ) = ExecutorOptions.decodeLzReceiveOption(_params.options);

        Origin memory origin = Origin({
            srcEid: packet.srcEid,
            sender: packet.sender.addressToBytes32(),
            nonce: packet.nonce
        });

        bytes memory payload = PacketV1Codec.encodePayload(packet);
        bytes32 payloadHash = keccak256(payload);

        LZEndpointV2Mock(lzEndpoint).receivePayload(
            origin,
            packet.receiver.bytes32ToAddress(),
            payloadHash,
            packet.message,
            gas,
            packet.guid
        );
    }

    function receivePayload(
        Origin calldata _origin,
        address _receiver,
        bytes32 _payloadHash,
        bytes calldata _message,
        uint128 _gas,
        bytes32 _guid
    ) external receiveNonReentrant {
        //        uint64 lazyNonce = lazyInboundNonce[_receiver][_origin.srcEid][_origin.sender];
        inboundPayloadHash[_receiver][_origin.srcEid][_origin.sender][_origin.nonce] = _payloadHash;
        try ILayerZeroReceiver(_receiver).lzReceive{ gas: _gas }(_origin, _guid, _message, address(0), "") {} catch (
            bytes memory /*reason*/
        ) {}
    }

    function _quote(
        MessagingParams calldata _params,
        address /*_sender*/
    ) internal view returns (MessagingFee memory messagingFee) {
        // 2) get Executor fee
        uint executorFee = _getExecutorFee(_params.message.length, _params.options);

        // 1) get Verifier fee
        // 3) get Treasury fee
        uint treasuryAndVerifierFee = _getTreasuryAndVerifierFees(executorFee, verifierFee);

        messagingFee.lzTokenFee = 0;
        messagingFee.nativeFee = executorFee + treasuryAndVerifierFee;
    }

    function _getExecutorFee(uint _payloadSize, bytes calldata _options) internal view returns (uint) {
        uint256 nativeFee;
        // 2) get Executor fee
        //  a) decodeLzReceiveOption
        //  b) decodeNativeDropOption
        //  c) decodeLzComposeOption
        (uint256 totalDstAmount, uint256 totalGas) = _decodeExecutorOptions(_options);
        uint remoteGasTotal = relayerFeeConfig.dstGasPriceInWei * (relayerFeeConfig.baseGas + totalGas);
        nativeFee += totalDstAmount + remoteGasTotal;

        // tokenConversionRate = dstPrice / localPrice
        // basePrice = totalRemoteToken * tokenConversionRate
        uint basePrice = (nativeFee * relayerFeeConfig.dstPriceRatio) / 10 ** 10;

        // pricePerByte = (dstGasPriceInWei * gasPerBytes) * tokenConversionRate
        uint pricePerByte = ((relayerFeeConfig.dstGasPriceInWei *
            relayerFeeConfig.gasPerByte *
            relayerFeeConfig.dstPriceRatio) / 10 ** 10) * _payloadSize;

        return basePrice + pricePerByte;
    }

    function _getTreasuryAndVerifierFees(uint _executorFee, uint _verifierFee) internal view returns (uint) {
        return ((_executorFee + _verifierFee) * protocolFeeConfig.nativeBP) / 10000;
    }

    function _outbound(address _sender, uint32 _dstEid, bytes32 _receiver) internal returns (uint64 nonce) {
        unchecked {
            nonce = ++outboundNonce[_sender][_dstEid][_receiver];
        }
    }

    function setDestLzEndpoint(address destAddr, address lzEndpointAddr) external {
        lzEndpointLookup[destAddr] = lzEndpointAddr;
    }

    function _decodeExecutorOptions(
        bytes calldata _options
    ) internal view returns (uint256 dstAmount, uint256 totalGas) {
        if (_options.length == 0) {
            revert IExecutorFeeLib.NoOptions();
        }

        uint256 cursor = 0;
        totalGas = relayerFeeConfig.baseGas;

        while (cursor < _options.length) {
            (uint8 optionType, bytes calldata option, uint256 newCursor) = _options.nextExecutorOption(cursor);
            cursor = newCursor;

            if (optionType == ExecutorOptions.OPTION_TYPE_LZRECEIVE) {
                (uint128 gas, uint128 value) = ExecutorOptions.decodeLzReceiveOption(option);
                dstAmount += value;
                totalGas += gas;
            } else if (optionType == ExecutorOptions.OPTION_TYPE_NATIVE_DROP) {
                (uint128 nativeDropAmount, ) = ExecutorOptions.decodeNativeDropOption(option);
                dstAmount += nativeDropAmount;
            } else if (optionType == ExecutorOptions.OPTION_TYPE_LZCOMPOSE) {
                (, uint128 gas, uint128 value) = ExecutorOptions.decodeLzComposeOption(option);
                dstAmount += value;
                totalGas += gas;
            } else {
                revert IExecutorFeeLib.UnsupportedOptionType(optionType);
            }
        }

        if (cursor != _options.length) revert IExecutorFeeLib.InvalidExecutorOptions(cursor);
        if (dstAmount > relayerFeeConfig.dstNativeAmtCap)
            revert IExecutorFeeLib.NativeAmountExceedsCap(dstAmount, relayerFeeConfig.dstNativeAmtCap);
    }

    // NOT IMPLEMENTING
    function burn(address _oapp, uint32 _srcEid, bytes32 _sender, uint64 _nonce, bytes32 _payloadHash) external {}

    function clear(address _oapp, Origin calldata _origin, bytes32 _guid, bytes calldata _message) external {}

    mapping(address from => mapping(address to => mapping(bytes32 guid => mapping(uint16 index => bytes32 messageHash))))
        public composeQueue;

    function defaultReceiveLibrary(uint32 /*_eid*/) external pure returns (address) {
        return address(0);
    }

    function defaultReceiveLibraryTimeout(uint32 /*_eid*/) external pure returns (address lib, uint256 expiry) {
        return (address(0), 0);
    }

    function defaultSendLibrary(uint32 /*_eid*/) external pure returns (address) {
        return address(0);
    }

    function executable(Origin calldata /*_origin*/, address /*receiver*/) external pure returns (ExecutionState) {
        return ExecutionState.NotExecutable;
    }

    function getConfig(
        address /*_oapp*/,
        address /*_lib*/,
        uint32 /*_eid*/,
        uint32 /*_configType*/
    ) external pure returns (bytes memory config) {
        return bytes("0x");
    }

    function getReceiveLibrary(
        address /*receiver*/,
        uint32 /*_eid*/
    ) external pure returns (address lib, bool isDefault) {
        return (address(0), false);
    }

    function getRegisteredLibraries() external pure returns (address[] memory) {
        address[] memory addresses = new address[](1);
        addresses[0] = address(0);
        return addresses;
    }

    function getSendLibrary(address /*_sender*/, uint32 /*_eid*/) external pure returns (address lib) {
        return address(0);
    }

    function inboundNonce(address _receiver, uint32 _srcEid, bytes32 _sender) external view returns (uint64) {
        return lazyInboundNonce[_receiver][_srcEid][_sender];
    }

    function isDefaultSendLibrary(address /*_sender*/, uint32 /*_eid*/) external pure returns (bool) {
        return false;
    }

    function isRegisteredLibrary(address /*_lib*/) external pure returns (bool) {
        return false;
    }

    function isSupportedEid(uint32 /*_eid*/) external pure returns (bool) {
        return false;
    }

    function lzCompose(
        address /*_from,*/,
        address /*_to,*/,
        bytes32 /*_guid,*/,
        uint16 /*_index,*/,
        bytes calldata /*_message,*/,
        bytes calldata /*_extraData*/
    ) external payable {}

    function lzReceive(
        Origin calldata /*_origin,*/,
        address /*_receiver,*/,
        bytes32 /*_guid,*/,
        bytes calldata /*_message,*/,
        bytes calldata /*_extraData*/
    ) external payable {}

    function lzToken() external pure returns (address) {
        return address(0);
    }

    function nativeToken() external pure returns (address) {
        return address(0);
    }

    function nextGuid(
        address /*_sender,*/,
        uint32 /*_dstEid,*/,
        bytes32 /*_receiver*/
    ) external pure returns (bytes32) {
        return 0;
    }

    function nilify(
        address /*_oapp,*/,
        uint32 /*_srcEid,*/,
        bytes32 /*_sender,*/,
        uint64 /*_nonce,*/,
        bytes32 /*_payloadHash*/
    ) external {}

    function quote(MessagingParams calldata _params, address _sender) external view returns (MessagingFee memory) {
        return _quote(_params, _sender);
    }

    mapping(address receiver => mapping(uint32 srcEid => Timeout)) public receiveLibraryTimeout;

    function registerLibrary(address /*_lib*/) public {}

    function sendCompose(address, /*_to*/ bytes32, /*_guid*/ uint16, /*_index*/ bytes calldata /*_message*/) external {}

    function setConfig(address, /*_oapp*/ address, /*_lib*/ SetConfigParam[] calldata /*_params*/) external {}

    function setDefaultReceiveLibrary(uint32 /*_eid*/, address /*_newLib*/, uint256 /*_gracePeriod*/) external {}

    function setDefaultReceiveLibraryTimeout(uint32 /*_eid*/, address /*_lib*/, uint256 /*_expiry*/) external {}

    function setDefaultSendLibrary(uint32 /*_eid*/, address /*_newLib*/) external {}

    function setDelegate(address /*_delegate*/) external {}

    function setLzToken(address /*_lzToken*/) external {}

    function setReceiveLibrary(
        address,
        /*_oapp*/ uint32,
        /*_eid*/ address,
        /*_newLib*/ uint256 /*_gracePeriod*/
    ) external {}

    function setReceiveLibraryTimeout(
        address,
        /*_oapp*/ uint32,
        /*_eid*/ address,
        /*_lib*/ uint256 /*_gracePeriod*/
    ) external {}

    function setSendLibrary(address, /*_oapp*/ uint32, /*_eid*/ address /*_newLib*/) external {}

    function skip(address, /*_oapp*/ uint32, /*_srcEid*/ bytes32, /*_sender*/ uint64 /*_nonce*/) external {}

    function verifiable(
        Origin calldata /*_origin*/,
        address /*_receiver*/,
        address /*_receiveLib*/,
        bytes32 /*_payloadHash*/
    ) external pure returns (bool) {
        return false;
    }

    function verify(Origin calldata /*origin*/, address /*_receiver*/, bytes32 /*_payloadHash*/) external {}
}
