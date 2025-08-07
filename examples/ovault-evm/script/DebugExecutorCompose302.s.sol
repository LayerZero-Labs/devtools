// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";

/// @dev Debug script that takes in the same parameters as the compose302 message
///      and simulates the execution of the compose302 message.
/// @dev This is useful to debug failed messages. The "trace" will contain information such as the error or events and can be decoded
///      The following points to the interface that the executor implements and has the errors documented.
///      https://github.com/LayerZero-Labs/devtools/blob/main/packages/ovault-evm/contracts/interfaces/IVaultComposerSync.sol
/// @notice Most composer will be custom implementations so the above may not have all errors or events and you would have to reference the composer's implmentation.
contract DebugExecutorCompose302 is Script {
    address public executorCaller;
    address public executorContractAddress;
    address public fromAddress;
    address public toAddress;
    bytes32 public guid;
    uint16 public index;
    bytes public message;
    bytes public extraData;
    uint256 public gasLimit;
    uint256 public msgValue;

    uint256 public constant executorOverheadGas = 30_000; // Overhead gas for the executor since the contract will consume some gas

    function setUp() public {
        /// @dev Ex: https://sepolia.arbiscan.io/tx/0xbcace8c9d6c460e272a2693c9271b6bb1da70207beaa175bd0a9d925703396cf
        /// @dev This is the address that that sends the failed transaction on etherscan -
        ///      From the example this would be: 0xF5E8A439C599205C1aB06b535DE46681Aed1007a
        executorCaller = vm.envAddress("EXECUTOR_CALLER_ADDRESS");
        /// @dev This would be the to address: 0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897
        executorContractAddress = vm.envAddress("EXECUTOR_ADDRESS");

        /// @dev This information is from the payload of the compose302 message.
        ///      etherscan transaction (the example above) -> more details -> input data -> decode input data
        /// @dev If you do not have that you can use `cast call $ADDR <payload> --rpc-url $RPC_URL --trace` to get the payload
        fromAddress = vm.envAddress("FROM_ADDRESS");
        toAddress = vm.envAddress("TO_ADDRESS");
        guid = vm.envBytes32("GUID");
        index = 0; /// @note This is usually 0 unless you have multiple compose messages in the same transaction
        message = vm.envBytes("MESSAGE"); // This is the payload that was sent in the compose302 message
        extraData = "";

        gasLimit = vm.envUint("GAS_LIMIT"); // a vanilla ERC4626 consumes about 500_000 gas
        /// @dev If the composer needs to send a layerzero transaction this will have to be something non 0
        msgValue = vm.envUint("MSG_VALUE");
    }
    function run() public {
        vm.prank(executorCaller);
        IExecutor(executorContractAddress).compose302{ value: msgValue, gas: gasLimit + executorOverheadGas }(
            fromAddress,
            toAddress,
            guid,
            index,
            message,
            extraData,
            gasLimit
        );
    }
}

interface IExecutor {
    function compose302(
        address _from,
        address _to,
        bytes32 _guid,
        uint16 _index,
        bytes calldata _message,
        bytes calldata _extraData,
        uint256 _gasLimit
    ) external payable;
}
