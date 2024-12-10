// SPDX-License-Identifier: LZBL-1.2
pragma solidity ^0.8.0;

import { ILayerZeroEndpointV2, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";

import { IUltraLightNode301 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/uln301/interfaces/IUltraLightNode301.sol";
import { IExecutor } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutor.sol";
import { IExecutorFeeLib } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutorFeeLib.sol";

// @dev oz4/5 breaking change... path
import { WorkerMock as Worker } from "./WorkerMock.sol";
// @dev oz4/5 breaking change... upgradeable reentrancy
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ExecutorMock is Worker, ReentrancyGuard, IExecutor {
    using PacketV1Codec for bytes;

    mapping(uint32 dstEid => DstConfig) public dstConfig;

    // endpoint v2
    address public endpoint;
    uint32 public localEidV2;

    // endpoint v1
    address public receiveUln301;

    constructor(
        address _endpoint,
        address _receiveUln301,
        address[] memory _messageLibs,
        address _priceFeed,
        address _roleAdmin,
        address[] memory _admins
    ) Worker(_messageLibs, _priceFeed, 12000, _roleAdmin, _admins) {
        endpoint = _endpoint;
        localEidV2 = ILayerZeroEndpointV2(_endpoint).eid();
        receiveUln301 = _receiveUln301;
    }

    // --- Admin ---
    function setDstConfig(DstConfigParam[] memory _params) external onlyRole(ADMIN_ROLE) {
        for (uint256 i = 0; i < _params.length; i++) {
            DstConfigParam memory param = _params[i];
            dstConfig[param.dstEid] = DstConfig(
                param.lzReceiveBaseGas,
                param.multiplierBps,
                param.floorMarginUSD,
                param.nativeCap,
                param.lzComposeBaseGas
            );
        }
        emit DstConfigSet(_params);
    }

    function nativeDrop(
        Origin calldata _origin,
        uint32 _dstEid,
        address _oapp,
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        _nativeDrop(_origin, _dstEid, _oapp, _nativeDropParams, _nativeDropGasLimit);
    }

    function nativeDropAndExecute301(
        Origin calldata _origin,
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit,
        bytes calldata _packet,
        uint256 _gasLimit
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        _nativeDrop(_origin, _packet.dstEid(), _packet.receiverB20(), _nativeDropParams, _nativeDropGasLimit);
        IUltraLightNode301(receiveUln301).commitVerification(_packet, _gasLimit);
    }

    function execute301(bytes calldata _packet, uint256 _gasLimit) external onlyRole(ADMIN_ROLE) nonReentrant {
        IUltraLightNode301(receiveUln301).commitVerification(_packet, _gasLimit);
    }

    function execute302(ExecutionParams calldata _executionParams) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        ILayerZeroEndpointV2(endpoint).lzReceive{ value: msg.value, gas: _executionParams.gasLimit }(
            _executionParams.origin,
            _executionParams.receiver,
            _executionParams.guid,
            _executionParams.message,
            _executionParams.extraData
        );
    }

    function compose302(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 _index,
        bytes calldata _message,
        bytes calldata _extraData,
        uint256 _gasLimit
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        ILayerZeroEndpointV2(endpoint).lzCompose{ value: msg.value, gas: _gasLimit }(
            _from,
            _to,
            _guid,
            _index,
            _message,
            _extraData
        );
    }

    function nativeDropAndExecute302(
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit,
        ExecutionParams calldata _executionParams
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 spent = _nativeDrop(
            _executionParams.origin,
            localEidV2,
            _executionParams.receiver,
            _nativeDropParams,
            _nativeDropGasLimit
        );

        uint256 value = msg.value - spent;
        // ignore the execution result
        ILayerZeroEndpointV2(endpoint).lzReceive{ value: value, gas: _executionParams.gasLimit }(
            _executionParams.origin,
            _executionParams.receiver,
            _executionParams.guid,
            _executionParams.message,
            _executionParams.extraData
        );
    }

    // --- Message Lib ---
    function assignJob(
        uint32 _dstEid,
        address _sender,
        uint256 _calldataSize,
        bytes calldata _options
    ) external onlyRole(MESSAGE_LIB_ROLE) onlyAcl(_sender) returns (uint256 fee) {
        IExecutorFeeLib.FeeParams memory params = IExecutorFeeLib.FeeParams(
            priceFeed,
            _dstEid,
            _sender,
            _calldataSize,
            defaultMultiplierBps
        );
        fee = IExecutorFeeLib(workerFeeLib).getFeeOnSend(params, dstConfig[_dstEid], _options);
    }

    // assignJob for ReadLib
    function assignJob(
        address _sender,
        bytes calldata _options
    ) external onlyRole(MESSAGE_LIB_ROLE) onlyAcl(_sender) returns (uint256 fee) {
        IExecutorFeeLib.FeeParamsForRead memory params = IExecutorFeeLib.FeeParamsForRead(
            priceFeed,
            _sender,
            defaultMultiplierBps
        );
        fee = IExecutorFeeLib(workerFeeLib).getFeeOnSend(params, dstConfig[localEidV2], _options);
    }

    // --- Only ACL ---
    function getFee(
        uint32 _dstEid,
        address _sender,
        uint256 _calldataSize,
        bytes calldata _options
    ) external view onlyAcl(_sender) whenNotPaused returns (uint256 fee) {
        IExecutorFeeLib.FeeParams memory params = IExecutorFeeLib.FeeParams(
            priceFeed,
            _dstEid,
            _sender,
            _calldataSize,
            defaultMultiplierBps
        );
        fee = IExecutorFeeLib(workerFeeLib).getFee(params, dstConfig[_dstEid], _options);
    }

    function getFee(address _sender, bytes calldata _options) external view onlyAcl(_sender) returns (uint256 fee) {
        IExecutorFeeLib.FeeParamsForRead memory params = IExecutorFeeLib.FeeParamsForRead(
            priceFeed,
            _sender,
            defaultMultiplierBps
        );
        fee = IExecutorFeeLib(workerFeeLib).getFee(params, dstConfig[localEidV2], _options);
    }

    function _nativeDrop(
        Origin calldata _origin,
        uint32 _dstEid,
        address _oapp,
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit
    ) internal returns (uint256 spent) {
        bool[] memory success = new bool[](_nativeDropParams.length);
        for (uint256 i = 0; i < _nativeDropParams.length; i++) {
            NativeDropParams memory param = _nativeDropParams[i];

            (bool sent, ) = param.receiver.call{ value: param.amount, gas: _nativeDropGasLimit }("");

            success[i] = sent;
            spent += param.amount;
        }
        emit NativeDropApplied(_origin, _dstEid, _oapp, _nativeDropParams, success);
    }
}
