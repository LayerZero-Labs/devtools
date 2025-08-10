// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { IExecutor } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutor.sol";
import { IWorker } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IWorker.sol";

interface ILayerZeroEndpointV2 {
    function eid() external view returns (uint32);

    function lzReceive(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable;

    function lzReceiveAlert(
        Origin calldata _origin,
        address _receiver,
        bytes32 _guid,
        uint256 _gas,
        uint256 _value,
        bytes calldata _message,
        bytes calldata _extraData,
        bytes calldata _reason
    ) external;

    function lzCompose(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 _index,
        bytes calldata _message,
        bytes calldata _extraData
    ) external payable;

    function lzComposeAlert(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 _index,
        uint256 _gas,
        uint256 _value,
        bytes calldata _message,
        bytes calldata _extraData,
        bytes calldata _reason
    ) external;
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
contract SimpleExecutorMock is IWorker, AccessControl, Pausable, ReentrancyGuard, IExecutor {
    bytes32 internal constant MESSAGE_LIB_ROLE = keccak256("MESSAGE_LIB_ROLE");
    bytes32 internal constant ALLOWLIST = keccak256("ALLOWLIST");
    bytes32 internal constant DENYLIST = keccak256("DENYLIST");
    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(uint32 dstEid => DstConfig) public dstConfig;

    // endpoint v2
    address public endpoint;
    uint32 public localEidV2;

    // Worker state variables
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
        address[] memory _messageLibs
    ) {
        endpoint = _endpoint;
        localEidV2 = ILayerZeroEndpointV2(_endpoint).eid();
        
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
    }

    // --- Worker Interface Implementation ---
    
    function setPriceFeed(address _priceFeed) external onlyRole(ADMIN_ROLE) {
        priceFeed = _priceFeed;
        emit SetPriceFeed(_priceFeed);
    }

    function setDefaultMultiplierBps(uint16 _multiplierBps) external onlyRole(ADMIN_ROLE) {
        defaultMultiplierBps = _multiplierBps;
        emit SetDefaultMultiplierBps(_multiplierBps);
    }

    function withdrawFee(address _lib, address _to, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        if (!hasRole(MESSAGE_LIB_ROLE, _lib)) revert Worker_OnlyMessageLib();
        // Mock implementation - in real Worker this would call ISendLib(_lib).withdrawFee(_to, _amount);
        emit Withdraw(_lib, _to, _amount);
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

    function setPaused(bool _paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    function setWorkerFeeLib(address _workerFeeLib) external onlyRole(ADMIN_ROLE) {
        workerFeeLib = _workerFeeLib;
        emit SetWorkerLib(_workerFeeLib);
    }

    function withdrawToken(address _token, address _to, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        // Mock implementation - in real Worker this would use Transfer.nativeOrToken
        if (_token == address(0)) {
            (bool sent, ) = _to.call{value: _amount}("");
            require(sent, "Failed to send native token");
        } else {
            // For ERC20 tokens, this would need proper implementation
            // For mock purposes, we'll just emit an event
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
        try
            ILayerZeroEndpointV2(endpoint).lzReceive{ value: msg.value, gas: _executionParams.gasLimit }(
                _executionParams.origin,
                _executionParams.receiver,
                _executionParams.guid,
                _executionParams.message,
                _executionParams.extraData
            )
        {
            // do nothing
        } catch (bytes memory reason) {
            ILayerZeroEndpointV2(endpoint).lzReceiveAlert(
                _executionParams.origin,
                _executionParams.receiver,
                _executionParams.guid,
                _executionParams.gasLimit,
                msg.value,
                _executionParams.message,
                _executionParams.extraData,
                reason
            );
        }
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
        try
            ILayerZeroEndpointV2(endpoint).lzCompose{ value: msg.value, gas: _gasLimit }(
                _from,
                _to,
                _guid,
                _index,
                _message,
                _extraData
            )
        {
            // do nothing
        } catch (bytes memory reason) {
            ILayerZeroEndpointV2(endpoint).lzComposeAlert(
                _from,
                _to,
                _guid,
                _index,
                _gasLimit,
                msg.value,
                _message,
                _extraData,
                reason
            );
        }
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
        try
            ILayerZeroEndpointV2(endpoint).lzReceive{ value: value, gas: _executionParams.gasLimit }(
                _executionParams.origin,
                _executionParams.receiver,
                _executionParams.guid,
                _executionParams.message,
                _executionParams.extraData
            )
        {
            // do nothing
        } catch (bytes memory reason) {
            ILayerZeroEndpointV2(endpoint).lzReceiveAlert(
                _executionParams.origin,
                _executionParams.receiver,
                _executionParams.guid,
                _executionParams.gasLimit,
                value,
                _executionParams.message,
                _executionParams.extraData,
                reason
            );
        }
    }

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
    ) external virtual onlyRole(MESSAGE_LIB_ROLE) onlyAcl(_sender) whenNotPaused returns (uint256 fee) {
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
    ) external virtual onlyRole(MESSAGE_LIB_ROLE) onlyAcl(_sender) whenNotPaused returns (uint256 fee) {
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
    ) external view virtual onlyAcl(_sender) whenNotPaused returns (uint256 fee) {
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
    ) external view virtual onlyAcl(_sender) whenNotPaused returns (uint256 fee) {
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
