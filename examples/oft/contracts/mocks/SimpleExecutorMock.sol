// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { IExecutor } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/interfaces/IExecutor.sol";

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
 * - Simplified implementation without Worker inheritance
 * - Constructor-based (not initialize()) 
 * - NO price feed - hardcoded 0 fees (virtual methods for override)
 * - NO real fee calculations or economic incentives
 * - DOES handle real LayerZero message execution
 * 
 * ⚠️ LIMITATIONS: Zero fees break economic model, no mainnet use
 * ✅ USE FOR: Local testing, unit tests, prototyping
 * ❌ DON'T USE: Production, mainnet, real transactions
 * 
 * 📝 NOTE: Origin struct contains cross-chain message provenance:
 *   - srcEid: Source chain endpoint ID (e.g., 40161 for Ethereum)  
 *   - sender: Original sender address as bytes32
 *   - nonce: Message sequence number for ordering/deduplication
 */
contract SimpleExecutorMock is Ownable, Pausable, ReentrancyGuard, IExecutor {

    // LayerZero EndpointV2
    address public endpoint;
    uint32 public localEidV2;

    // Mapping to store destination configurations  
    mapping(uint32 => DstConfig) public dstConfigs;

    // Additional state variables
    address public priceFeed;
    uint16 public defaultMultiplierBps = 10000; // 100% multiplier
    mapping(uint32 => uint8[]) public supportedOptionTypes;

    /**
     * @notice Deploys SimpleExecutorMock with deployer as admin
     * @param _endpoint LayerZero EndpointV2 contract address
     * @param _messageLibs Array of SEND library addresses that can assign jobs (unused in mock)
     * @dev Deployer automatically gets owner role
     * @dev Uses simplified approach without Worker inheritance
     */
    constructor(
        address _endpoint,
        address[] memory _messageLibs // For compatibility with deploy script
    ) Ownable(msg.sender) {
        endpoint = _endpoint;
        localEidV2 = ILayerZeroEndpointV2(_endpoint).eid();
        // _messageLibs parameter kept for compatibility but not used in simplified version
    }

    /**
     * @notice Configures execution parameters for destination chains
     * @param _params Array of destination configuration parameters
     * @dev Only owner can call this function
     * @dev Emits DstConfigSet event for each configuration update
     */
    function setDstConfig(DstConfigParam[] memory _params) external onlyOwner {
        for (uint i = 0; i < _params.length; i++) {
            DstConfigParam memory param = _params[i];
            dstConfigs[param.dstEid] = DstConfig({
                lzReceiveBaseGas: param.lzReceiveBaseGas,
                multiplierBps: param.multiplierBps,
                floorMarginUSD: param.floorMarginUSD,
                nativeCap: param.nativeCap,
                lzComposeBaseGas: param.lzComposeBaseGas
            });
        }
        emit DstConfigSet(_params);
    }

    /**
     * @notice Executes a cross-chain message (Real LayerZero V2 implementation)
     * @param _params Execution parameters
     * @dev Real execution with try/catch for graceful error handling
     * @dev Calls the LayerZero endpoint to execute the message
     */
    function lzReceive(ExecutionParams calldata _params) external payable whenNotPaused nonReentrant {
        // Real LayerZero V2 execution
        try
            ILayerZeroEndpointV2(endpoint).lzReceive{ value: msg.value, gas: _params.gasLimit }(
                _params.origin,
                _params.receiver,
                _params.guid,
                _params.message,
                _params.extraData
            )
        {
            // Execution successful
        } catch (bytes memory reason) {
            // Handle execution failure with alert
            ILayerZeroEndpointV2(endpoint).lzReceiveAlert(
                _params.origin,
                _params.receiver,
                _params.guid,
                _params.gasLimit,
                msg.value,
                _params.message,
                _params.extraData,
                reason
            );
        }
    }

    /**
     * @notice Executes a compose message (Real LayerZero V2 implementation)
     * @param _params Execution parameters for compose
     * @dev Real compose execution with try/catch for graceful error handling
     */
    function lzCompose(ExecutionParams calldata _params) external payable whenNotPaused nonReentrant {
        // Note: For compose, we need additional parameters that aren't in ExecutionParams
        // This is a simplified version - in practice, you'd need compose-specific parameters
        revert("Use compose302 function for proper compose execution");
    }

    /**
     * @notice Executes a LayerZero V2 compose operation on the endpoint
     * @param _from Address that initiated the compose
     * @param _to Target contract for the compose operation
     * @param _guid Global unique identifier for the message
     * @param _index Index of the compose operation
     * @param _message Message payload for the compose
     * @param _extraData Additional data for the compose operation
     * @param _gasLimit Gas limit for the compose execution
     * @dev Only owner can call this function (simplified access control)
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
    ) external payable onlyOwner nonReentrant {
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
            // Compose successful
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
     * @notice Performs native token drops to specified addresses
     * @param _origin Origin information
     * @param _dstEid Destination endpoint ID
     * @param _oapp OApp address requesting the drop
     * @param _nativeDropParams Array of native drop parameters
     * @param _nativeDropGasLimit Gas limit for each native drop call
     * @dev Only owner can call this function (simplified access control)
     */
    function nativeDrop(
        Origin calldata _origin,
        uint32 _dstEid,
        address _oapp,
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit
    ) external payable onlyOwner nonReentrant {
        _nativeDrop(_origin, _dstEid, _oapp, _nativeDropParams, _nativeDropGasLimit);
    }

    /**
     * @notice Performs native drops and then executes a LayerZero V2 message
     * @param _nativeDropParams Array of native drop parameters
     * @param _nativeDropGasLimit Gas limit for each native drop call
     * @param _executionParams Parameters for message execution after drops
     * @dev Only owner can call this function (simplified access control)
     */
    function nativeDropAndExecute302(
        NativeDropParams[] calldata _nativeDropParams,
        uint256 _nativeDropGasLimit,
        ExecutionParams calldata _executionParams
    ) external payable onlyOwner nonReentrant {
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
            // Execution successful
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

        /**
     * @notice Queries execution fee for LayerZero operations (MOCKED - returns 0)
     * @param _dstEid Destination endpoint ID
     * @param _sender Address requesting the fee quote  
     * @param _calldataSize Size of the calldata
     * @param _options Execution options (ignored in mock)
     * @return price Execution fee (always 0 in mock implementation)
     * @dev MOCK: Returns hardcoded 0 fee for all operations
     * @dev Real executor would calculate based on gas costs and price feeds
     */
    function getFee(
        uint32 _dstEid,
        address _sender,
        uint256 _calldataSize,
        bytes calldata _options
    ) external view whenNotPaused returns (uint256 price) {
        // MOCK: Return 0 fee for all operations
        price = 0;
    }

    /**
     * @notice Queries execution fee for read operations (MOCKED - returns 0)
     * @param _sender Address requesting the fee quote
     * @param _options Read operation options (ignored in mock)
     * @return fee Execution fee (always 0 in mock implementation)
     * @dev MOCK: Returns hardcoded 0 fee for read operations
     */
    function getFee(
        address _sender,
        bytes calldata _options
    ) external view whenNotPaused returns (uint256 fee) {
        fee = 0; // MOCK: Override for custom fee logic
    }

    /**
     * @notice Gets destination configuration
     * @param _dstEid Destination endpoint ID
     * @return lzReceiveBaseGas Base gas for lzReceive
     * @return multiplierBps Multiplier in basis points
     * @return floorMarginUSD Floor margin in USD
     * @return nativeCap Native token cap
     * @return lzComposeBaseGas Base gas for lzCompose
     */
    function dstConfig(uint32 _dstEid) external view returns (uint64, uint16, uint128, uint128, uint64) {
        DstConfig memory config = dstConfigs[_dstEid];
        return (
            config.lzReceiveBaseGas,
            config.multiplierBps,
            config.floorMarginUSD,
            config.nativeCap,
            config.lzComposeBaseGas
        );
    }

    // IWorker interface implementations
    function setPriceFeed(address _priceFeed) external onlyOwner {
        priceFeed = _priceFeed;
    }

    function setDefaultMultiplierBps(uint16 _multiplierBps) external onlyOwner {
        defaultMultiplierBps = _multiplierBps;
    }

    function withdrawFee(address _lib, address _to, uint256 _amount) external onlyOwner {
        // MOCK: Simple withdrawal without real fee accounting
        payable(_to).transfer(_amount);
    }

    function setSupportedOptionTypes(uint32 _eid, uint8[] calldata _optionTypes) external onlyOwner {
        supportedOptionTypes[_eid] = _optionTypes;
    }

    function getSupportedOptionTypes(uint32 _eid) external view returns (uint8[] memory) {
        return supportedOptionTypes[_eid];
    }

    // ILayerZeroExecutor interface implementations
    function assignJob(
        uint32 _dstEid,
        address _sender,
        uint256 _calldataSize,
        bytes calldata _options
    ) external returns (uint256 fee) {
        // MOCK: Return 0 fee for job assignment
        return 0;
    }

    // ILayerZeroReadExecutor interface implementations  
    function assignJob(address _sender, bytes calldata _options) external returns (uint256 fee) {
        // MOCK: Return 0 fee for read job assignment
        return 0;
    }

    // Pausable functions
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
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

    // Additional required interface implementations for compatibility
    function version() external pure returns (uint64 major, uint8 minor, uint8 endpointVersion) {
        return (1, 0, 2); // Mock version
    }

    function messageLibType() external pure returns (uint8) {
        return 2; // Mock message lib type
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IExecutor).interfaceId;
    }
}