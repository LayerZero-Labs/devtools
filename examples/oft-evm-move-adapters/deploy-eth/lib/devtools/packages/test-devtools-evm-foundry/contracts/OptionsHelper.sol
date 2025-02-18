// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import { ExecutorOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/libs/ExecutorOptions.sol";
import { UlnOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/libs/UlnOptions.sol";

contract UlnOptionsMock {
    using UlnOptions for bytes;

    function decode(
        bytes calldata _options
    ) public pure returns (bytes memory executorOptions, bytes memory dvnOptions) {
        return UlnOptions.decode(_options);
    }
}

contract OptionsHelper {
    /// @dev For backwards compatibility reasons, we'll keep this initialization here
    /// @dev Any new tests should use the _setUpUlnOptions function below
    UlnOptionsMock ulnOptions = new UlnOptionsMock();

    function _setUpUlnOptions() internal {
        ulnOptions = new UlnOptionsMock();
    }

    function _parseExecutorLzReceiveOption(bytes memory _options) internal view returns (uint256 gas, uint256 value) {
        (bool exist, bytes memory option) = _getExecutorOptionByOptionType(
            _options,
            ExecutorOptions.OPTION_TYPE_LZRECEIVE
        );
        require(exist, "OptionsHelper: lzReceive option not found");
        (gas, value) = this.decodeLzReceiveOption(option);
    }

    function _parseExecutorNativeDropOption(
        bytes memory _options
    ) internal view returns (uint256 amount, bytes32 receiver) {
        (bool exist, bytes memory option) = _getExecutorOptionByOptionType(
            _options,
            ExecutorOptions.OPTION_TYPE_NATIVE_DROP
        );
        require(exist, "OptionsHelper: nativeDrop option not found");
        (amount, receiver) = this.decodeNativeDropOption(option);
    }

    function _parseExecutorLzComposeOption(
        bytes memory _options
    ) internal view returns (uint16 index, uint256 gas, uint256 value) {
        (bool exist, bytes memory option) = _getExecutorOptionByOptionType(
            _options,
            ExecutorOptions.OPTION_TYPE_LZCOMPOSE
        );
        require(exist, "OptionsHelper: lzCompose option not found");
        return this.decodeLzComposeOption(option);
    }

    function _parseExecutorLzReadOption(
        bytes memory _options
    ) internal view returns (uint128 gas, uint32 size, uint128 value) {
        (bool exist, bytes memory option) = _getExecutorOptionByOptionType(
            _options,
            ExecutorOptions.OPTION_TYPE_LZREAD
        );
        require(exist, "OptionsHelper: lzRead option not found");
        return this.decodeLzReadOption(option);
    }

    function _executorOptionExists(
        bytes memory _options,
        uint8 _executorOptionType
    ) internal view returns (bool exist) {
        (exist, ) = _getExecutorOptionByOptionType(_options, _executorOptionType);
    }

    function _getExecutorOptionByOptionType(
        bytes memory _options,
        uint8 _executorOptionType
    ) internal view returns (bool exist, bytes memory option) {
        (bytes memory executorOpts, ) = ulnOptions.decode(_options);

        uint256 cursor;

        // Used to accumulate the total gas and value for the chained executor options
        uint128 executorGas;
        uint128 executorValue;
        uint32 calldataSize;

        // Accumulated payload
        bytes memory payload = new bytes(0);

        while (cursor < executorOpts.length) {
            (uint8 optionType, bytes memory op, uint256 nextCursor) = this.nextExecutorOption(executorOpts, cursor);

            // There are 3 kinds of executor options -- lzReceive, nativeDrop, lzCompose.
            if (optionType == _executorOptionType) {
                uint128 gas;
                uint128 value;
                bytes32 receiver;
                uint16 index;
                uint32 size;
                if (optionType == ExecutorOptions.OPTION_TYPE_LZRECEIVE) {
                    (gas, value) = this.decodeLzReceiveOption(op);
                    executorGas += gas;
                    executorValue += value;
                    payload = abi.encodePacked(executorGas, executorValue);
                } else if (optionType == ExecutorOptions.OPTION_TYPE_NATIVE_DROP) {
                    // Since there is a receiver in the nativeDrop options, do we do this differently?
                    (value, receiver) = this.decodeNativeDropOption(op);
                    executorValue += value;
                    payload = abi.encodePacked(executorValue, receiver);
                } else if (optionType == ExecutorOptions.OPTION_TYPE_LZCOMPOSE) {
                    (index, gas, value) = this.decodeLzComposeOption(op);
                    executorGas += gas;
                    executorValue += value;
                    payload = abi.encodePacked(index, executorGas, executorValue);
                } else if (optionType == ExecutorOptions.OPTION_TYPE_LZREAD) {
                    (gas, size, value) = this.decodeLzReadOption(op);
                    executorValue += value;
                    executorGas += gas;
                    calldataSize += size;
                    payload = abi.encodePacked(executorGas,calldataSize, executorValue);
                }
            }
            cursor = nextCursor;
        }

        if (payload.length == 0) {
            return (false, payload);
        }
        return (true, payload);
    }

    function nextExecutorOption(
        bytes calldata _options,
        uint256 _cursor
    ) external pure returns (uint8 optionType, bytes calldata option, uint256 cursor) {
        return ExecutorOptions.nextExecutorOption(_options, _cursor);
    }

    function decodeLzReceiveOption(bytes calldata _option) external pure returns (uint128 gas, uint128 value) {
        return ExecutorOptions.decodeLzReceiveOption(_option);
    }

    function decodeNativeDropOption(bytes calldata _option) external pure returns (uint128 amount, bytes32 receiver) {
        return ExecutorOptions.decodeNativeDropOption(_option);
    }

    function decodeLzComposeOption(
        bytes calldata _option
    ) external pure returns (uint16 index, uint128 gas, uint128 value) {
        return ExecutorOptions.decodeLzComposeOption(_option);
    }

    function decodeLzReadOption(
        bytes calldata _option
    ) external pure returns (uint128 gas, uint32 size, uint128 value) {
        return ExecutorOptions.decodeLzReadOption(_option);
    }
}
