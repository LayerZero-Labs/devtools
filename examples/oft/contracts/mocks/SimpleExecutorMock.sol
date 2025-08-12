// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { ILayerZeroEndpointV2, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { Transfer } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/Transfer.sol";
import { ExecutionState, EndpointV2View } from "@layerzerolabs/lz-evm-protocol-v2/contracts/EndpointV2View.sol";

import { IExecutor } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutor.sol";
import { IWorker } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IWorker.sol";
import { VerificationState } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/uln302/ReceiveUln302View.sol";
import { IReceiveUlnE2 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/interfaces/IReceiveUlnE2.sol";

// Lightweight view interface to query verifiability from the ReceiveUln view
interface IReceiveUlnView {
    function verifiable(bytes calldata _packetHeader, bytes32 _payloadHash) external view returns (VerificationState);
}

/**
 * @title SimpleExecutorMock
 * @notice Mock executor for development/testing ONLY - returns 0 fees
 * 
 * 🔧 DIFFERENCES FROM REAL EXECUTOR:
 * - Implements IWorker instead of inheriting Worker - avoids OpenZeppelin v4/v5 conflicts
 * - Constructor-based (not initialize()) 
 * - NO price feed - hardcoded 0 fees (virtual methods for override)
 * - NO ULN301 support - V2 operations only
 * - NO real fee calculations or economic incentives
 * 
 * ⚠️ LIMITATIONS: Zero fees break economic model, cannot upgrade, no mainnet use
 * ✅ USE FOR: Local testing, unit tests, prototyping
 * ❌ DON'T USE: Production, mainnet, real transactions
 * 
 * 📝 NOTE: Origin struct contains cross-chain message provenance:
 *   - srcEid: Source chain endpoint ID (e.g., 40161 for Ethereum)  
 *   - sender: Original sender address as bytes32
 *   - nonce: Message sequence number for ordering/deduplication
 */
contract SimpleExecutorMock is IWorker, AccessControl, ReentrancyGuard, IExecutor, EndpointV2View {
    bytes32 internal constant MESSAGE_LIB_ROLE = keccak256("MESSAGE_LIB_ROLE");
    bytes32 internal constant ALLOWLIST = keccak256("ALLOWLIST");
    bytes32 internal constant DENYLIST = keccak256("DENYLIST");
    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(uint32 dstEid => DstConfig) public dstConfig;

    // endpoint v2 (inherited from EndpointV2View)
    uint32 public localEidV2;

    // Optional ULN receive lib to use (overrides _receiveLib when set)
    address public receiveUln302;

    // Mapping from receive lib to its view contract
    mapping(address receiveLib => address receiveLibView) public receiveLibToView;

    event ReceiveLibViewSet(address _receiveLib, address _receiveLibView);

    // Worker state variables (kept minimal for tests)
    address public workerFeeLib;
    uint64 public allowlistSize;
    uint16 public defaultMultiplierBps;
    address public priceFeed;
    mapping(uint32 eid => uint8[] optionTypes) internal supportedOptionTypes;

    /**
     * @notice Deploys SimpleExecutor with deployer as admin
     * @param _endpoint LayerZero EndpointV2 contract address
     * @param _messageLibs Array of SEND library addresses that can assign jobs. Recommendation: SendUln302, ReadLib1002.
     * @dev Deployer automatically gets both DEFAULT_ADMIN_ROLE and ADMIN_ROLE
     * @dev Uses address(0) for price feed since fees are mocked
     */
    constructor(
        address _endpoint,
        address[] memory _messageLibs,
        address _receiveUln302,
        address _receiveUln302View
    ) {
        endpoint = ILayerZeroEndpointV2(_endpoint);
        localEidV2 = endpoint.eid();
        
        // Initialize Worker-like state
        defaultMultiplierBps = 12000;
        priceFeed = address(0);
        
        // Grant roles to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Grant MESSAGE_LIB_ROLE to provided message libs
        for (uint256 i = 0; i < _messageLibs.length; ++i) {
            _grantRole(MESSAGE_LIB_ROLE, _messageLibs[i]);
        }

        // Initialize receive lib and its view for verification checks used in commitAndExecute
        receiveUln302 = _receiveUln302;
        receiveLibToView[_receiveUln302] = _receiveUln302View;
        emit ReceiveLibViewSet(_receiveUln302, _receiveUln302View);
    }

    // --- Worker Interface Implementation ---
    
    function withdrawFee(address _lib, address _to, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        if (!hasRole(MESSAGE_LIB_ROLE, _lib)) revert Worker_OnlyMessageLib();
        // Mock implementation - in real Worker this would call ISendLib(_lib).withdrawFee(_to, _amount);
        emit Withdraw(_lib, _to, _amount);
    }

    // --- Worker-required functions (IWorker) ---

    function setPriceFeed(address _priceFeed) external onlyRole(ADMIN_ROLE) {
        priceFeed = _priceFeed;
        emit SetPriceFeed(_priceFeed);
    }

    function setDefaultMultiplierBps(uint16 _multiplierBps) external onlyRole(ADMIN_ROLE) {
        defaultMultiplierBps = _multiplierBps;
        emit SetDefaultMultiplierBps(_multiplierBps);
    }

    function setSupportedOptionTypes(uint32 _eid, uint8[] calldata _optionTypes) external onlyRole(ADMIN_ROLE) {
        supportedOptionTypes[_eid] = _optionTypes;
        emit SetSupportedOptionTypes(_eid, _optionTypes);
    }

    function getSupportedOptionTypes(uint32 _eid) external view returns (uint8[] memory) {
        return supportedOptionTypes[_eid];
    }

    // --- Worker-like functionality ---

    modifier onlyAcl(address _sender) {
        if (!hasAcl(_sender)) {
            revert Worker_NotAllowed();
        }
        _;
    }

    function hasAcl(address _sender) public view returns (bool) {
        if (hasRole(DENYLIST, _sender)) {
            return false;
        } else if (allowlistSize == 0 || hasRole(ALLOWLIST, _sender)) {
            return true;
        } else {
            return false;
        }
    }


    // Override AccessControl to handle allowlist counting
    function _grantRole(bytes32 _role, address _account) internal override returns (bool) {
        if (_role == ALLOWLIST && !hasRole(_role, _account)) {
            ++allowlistSize;
        }
        return super._grantRole(_role, _account);
    }

    function _revokeRole(bytes32 _role, address _account) internal override returns (bool) {
        if (_role == ALLOWLIST && hasRole(_role, _account)) {
            --allowlistSize;
        }
        return super._revokeRole(_role, _account);
    }

    function renounceRole(bytes32 /*role*/, address /*account*/) public pure override {
        revert Worker_RoleRenouncingDisabled();
    }

    // --- Admin ---
    /**
     * @notice Configures execution parameters for destination chains
     * @param _params Array of destination configuration parameters
     * @dev Only admins can call this function
     * @dev Emits DstConfigSet event for each configuration update
     */
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

    /**
     * @notice Performs native token drops to specified addresses
     * @param _origin Origin information (srcEid: source chain ID, sender: original sender address, nonce: message sequence)
     * @param _dstEid Destination endpoint ID
     * @param _oapp OApp address requesting the drop
     * @param _nativeDropParams Array of native drop parameters (receiver, amount)
     * @param _nativeDropGasLimit Gas limit for each native drop call
     * @dev Only admins can call this function
     * @dev Requires sufficient msg.value to cover all drops
     */
    function nativeDrop(
        Origin calldata _origin,
        uint32 _dstEid,
        address _oapp,
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        _nativeDrop(_origin, _dstEid, _oapp, _nativeDropParams, _nativeDropGasLimit);
    }

    /**
     * @notice Executes a LayerZero V2 message on the endpoint
     * @param _executionParams Parameters for message execution including Origin (srcEid, sender, nonce), receiver, guid, message, etc.
     * @dev Only admins can call this function
     * @dev Uses try/catch to handle execution failures gracefully with alerts
     * @dev Part of LayerZero V2 protocol - no ULN301 support
     */
    function execute302(ExecutionParams calldata _executionParams) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        endpoint.lzReceive{ value: msg.value, gas: _executionParams.gasLimit }(
            _executionParams.origin,
            _executionParams.receiver,
            _executionParams.guid,
            _executionParams.message,
            _executionParams.extraData
        );
    }

    /**
     * @notice Executes a LayerZero V2 compose operation on the endpoint
     * @param _from Address that initiated the compose (contains Origin with srcEid, sender, nonce from original message)
     * @param _to Target contract for the compose operation
     * @param _guid Global unique identifier for the message
     * @param _index Index of the compose operation
     * @param _message Message payload for the compose
     * @param _extraData Additional data for the compose operation
     * @param _gasLimit Gas limit for the compose execution
     * @dev Only admins can call this function
     * @dev Uses try/catch to handle compose failures gracefully with alerts
     */
    function compose302(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 _index,
        bytes calldata _message,
        bytes calldata _extraData,
        uint256 _gasLimit
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        endpoint.lzCompose{ value: msg.value, gas: _gasLimit }(
            _from,
            _to,
            _guid,
            _index,
            _message,
            _extraData
        );
    }

    /**
     * @notice Performs native drops and then executes a LayerZero V2 message
     * @param _nativeDropParams Array of native drop parameters (receiver, amount)
     * @param _nativeDropGasLimit Gas limit for each native drop call
     * @param _executionParams Parameters including Origin (srcEid, sender, nonce) for message execution after drops
     * @dev Only admins can call this function
     * @dev First performs native drops, then executes with remaining msg.value
     * @dev Uses try/catch for execution failures with alerts
     */
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
        endpoint.lzReceive{ value: value, gas: _executionParams.gasLimit }(
            _executionParams.origin,
            _executionParams.receiver,
            _executionParams.guid,
            _executionParams.message,
            _executionParams.extraData
        );
    }

    // ============================ Admin (Views) ===================================
    

    // ============================ External ===================================
    /// @notice process for commit and execute
    /// 1. check if executable, revert if executed, execute if executable
    /// 2. check if verifiable, revert if verifying, commit if verifiable
    /// 3. native drop
    /// 4. try execute, will revert if not executable
    struct LzReceiveParam {
        Origin origin;
        address receiver;
        bytes32 guid;
        bytes message;
        bytes extraData;
        uint256 gas;
        uint256 value;
    }

    struct NativeDropParam {
        address _receiver;
        uint256 _amount;
    }

    function commitAndExecute(
        address _receiveLib,
        LzReceiveParam calldata _lzReceiveParam,
        NativeDropParam[] calldata _nativeDropParams
    ) external payable {
        // 1. check if executable, revert if executed
        ExecutionState executionState = executable(_lzReceiveParam.origin, _lzReceiveParam.receiver);
        if (executionState == ExecutionState.Executed) revert LzExecutor_Executed();

        // 2. if not executable, check if verifiable, revert if verifying, commit if verifiable
        if (executionState != ExecutionState.Executable) {
            address receiveLib = receiveUln302 == address(0x0) ? _receiveLib : address(receiveUln302);
            bytes memory packetHeader = abi.encodePacked(
                uint8(1), // packet version 1
                _lzReceiveParam.origin.nonce,
                _lzReceiveParam.origin.srcEid,
                _lzReceiveParam.origin.sender,
                localEidV2,
                bytes32(uint256(uint160(_lzReceiveParam.receiver)))
            );
            bytes32 payloadHash = keccak256(abi.encodePacked(_lzReceiveParam.guid, _lzReceiveParam.message));

            address receiveLibView = receiveLibToView[receiveLib];
            if (receiveLibView == address(0x0)) revert LzExecutor_ReceiveLibViewNotSet();

            VerificationState verificationState = IReceiveUlnView(receiveLibView).verifiable(packetHeader, payloadHash);
            if (verificationState == VerificationState.Verifiable) {
                // verification required
                IReceiveUlnE2(receiveLib).commitVerification(packetHeader, payloadHash);
            } else if (verificationState == VerificationState.Verifying) {
                revert LzExecutor_Verifying();
            }
        }

        // 3. native drop
        for (uint256 i = 0; i < _nativeDropParams.length; i++) {
            NativeDropParam calldata param = _nativeDropParams[i];
            Transfer.native(param._receiver, param._amount);
        }

        // 4. try execute, will revert if not executable
        endpoint.lzReceive{ gas: _lzReceiveParam.gas, value: _lzReceiveParam.value }(
            _lzReceiveParam.origin,
            _lzReceiveParam.receiver,
            _lzReceiveParam.guid,
            _lzReceiveParam.message,
            _lzReceiveParam.extraData
        );
    }

    // Errors mirrored from DestinationExecutorMock for parity
    error LzExecutor_Executed();
    error LzExecutor_Verifying();
    error LzExecutor_ReceiveLibViewNotSet();

    // --- Message Lib (MOCKED - Returns 0 fees) ---
    /**
     * @notice Assigns a cross-chain execution job (MOCKED - returns 0 fee)
     * @param _dstEid Destination endpoint ID
     * @param _sender Address requesting the execution
     * @param _calldataSize Size of the execution data
     * @param _options Execution options (ignored in mock)
     * @return fee Execution fee (always 0 in mock implementation)
     * @dev MOCK: Returns hardcoded 0 fee instead of real calculation
     * @dev Only authorized message libraries can call this function
     * @dev Virtual function - can be overridden for custom fee logic
     */
    function assignJob(
        uint32 _dstEid,
        address _sender,
        uint256 _calldataSize,
        bytes calldata _options
    ) external virtual onlyRole(MESSAGE_LIB_ROLE) onlyAcl(_sender) returns (uint256 fee) {
        fee = 0; // MOCK: Override for custom fee logic
    }

    /**
     * @notice Assigns a read operation job (MOCKED - returns 0 fee)
     * @param _sender Address requesting the read operation
     * @param _options Read operation options (ignored in mock)
     * @return fee Execution fee (always 0 in mock implementation)
     * @dev MOCK: Returns hardcoded 0 fee for read operations
     * @dev Only authorized message libraries can call this function
     * @dev Virtual function - can be overridden for custom fee logic
     */
    function assignJob(
        address _sender,
        bytes calldata _options
    ) external virtual onlyRole(MESSAGE_LIB_ROLE) onlyAcl(_sender) returns (uint256 fee) {
        fee = 0; // MOCK: Override for custom fee logic
    }

    // --- Fee Queries (MOCKED - Returns 0 fees) ---
    /**
     * @notice Queries execution fee for cross-chain operations (MOCKED - returns 0)
     * @param _dstEid Destination endpoint ID
     * @param _sender Address requesting the fee quote
     * @param _calldataSize Size of the execution data
     * @param _options Execution options (ignored in mock)
     * @return fee Execution fee (always 0 in mock implementation)
     * @dev MOCK: Returns hardcoded 0 fee instead of real calculation
     * @dev Real executor would calculate based on gas costs and price feeds
     * @dev Virtual function - can be overridden for custom fee logic
     */
    function getFee(
        uint32 _dstEid,
        address _sender,
        uint256 _calldataSize,
        bytes calldata _options
    ) external view virtual onlyAcl(_sender) returns (uint256 fee) {
        fee = 0; // MOCK: Override for custom fee logic
    }

    /**
     * @notice Queries execution fee for read operations (MOCKED - returns 0)
     * @param _sender Address requesting the fee quote
     * @param _options Read operation options (ignored in mock)
     * @return fee Execution fee (always 0 in mock implementation)
     * @dev MOCK: Returns hardcoded 0 fee for read operations
     * @dev Real executor would calculate based on gas costs and price feeds
     * @dev Virtual function - can be overridden for custom fee logic
     */
    function getFee(
        address _sender,
        bytes calldata _options
    ) external view virtual onlyAcl(_sender) returns (uint256 fee) {
        fee = 0; // MOCK: Override for custom fee logic
    }

    /**
     * @notice Internal function to perform native token drops
     * @param _origin Origin information for the drop operation
     * @param _dstEid Destination endpoint ID
     * @param _oapp OApp address requesting the drops
     * @param _nativeDropParams Array of drop parameters (receiver, amount)
     * @param _nativeDropGasLimit Gas limit for each individual drop call
     * @return spent Total amount of native tokens spent on drops
     * @dev Attempts to send native tokens to each receiver with specified gas limit
     * @dev Emits NativeDropApplied event with success status for each drop
     */
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
