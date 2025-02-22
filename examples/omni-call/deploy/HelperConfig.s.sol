// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { Script } from "forge-std/Script.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";
import { SetConfigParam } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";

contract HelperConfig is Script {
    struct Config {
        address endpoint;
        address executor;
        address DVN;
        uint32 eid;
        uint32 dstEid;
        uint256 key;
    }

    Config public activeNetworkConfig;

    uint256 public constant DEFAULT_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint32 public constant EXECUTOR_CONFIG_TYPE = 1;
    uint32 public constant ULN_CONFIG_TYPE = 2;
    uint32 public constant MAX_MESSAGE_SIZE = 0; // type(uint32).max;

    constructor() {
        if (block.chainid == 43113) {
            activeNetworkConfig = Config({
                endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f,
                executor: 0xa7BFA9D51032F82D649A501B6a1f922FC2f7d4e3,
                DVN: 0x9f0e79Aeb198750F963b6f30B99d87c6EE5A0467,
                eid: 40106,
                dstEid: 40267, // amoy
                key: vm.envUint("PRIVATE_KEY")
            });
        } else if (block.chainid == 80002) {
            activeNetworkConfig = Config({
                endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f,
                executor: 0x4Cf1B3Fa61465c2c907f82fC488B43223BA0CF93,
                DVN: 0x55c175DD5b039331dB251424538169D8495C18d1,
                eid: 40267,
                dstEid: 40106, // fuji
                key: vm.envUint("PRIVATE_KEY")
            });
        } else {
            activeNetworkConfig = Config({
                endpoint: address(0),
                executor: address(0),
                DVN: address(0),
                eid: 0,
                dstEid: 0,
                key: DEFAULT_KEY
            });
        }
    }

    function getConfig(
        address proxy
    )
        public
        view
        returns (
            SetConfigParam[] memory sendConfigParams,
            address sendLibraryAddress,
            SetConfigParam[] memory receiveConfigParams,
            address receiveLibraryAddress
        )
    {
        ExecutorConfig memory executorConfig = ExecutorConfig({
            maxMessageSize: MAX_MESSAGE_SIZE,
            executor: activeNetworkConfig.executor
        });

        address[] memory optionalDVNs;
        address[] memory requiredDVNs = new address[](1);
        requiredDVNs[0] = activeNetworkConfig.DVN;

        UlnConfig memory ulnConfig = UlnConfig({
            confirmations: 1,
            requiredDVNCount: 1,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: requiredDVNs,
            optionalDVNs: optionalDVNs
        });

        sendConfigParams = new SetConfigParam[](2);
        sendConfigParams[0] = SetConfigParam({
            eid: activeNetworkConfig.dstEid,
            configType: EXECUTOR_CONFIG_TYPE,
            config: abi.encode(executorConfig)
        });

        sendConfigParams[1] = SetConfigParam({
            eid: activeNetworkConfig.dstEid,
            configType: ULN_CONFIG_TYPE,
            config: abi.encode(ulnConfig)
        });

        receiveConfigParams = new SetConfigParam[](1);
        receiveConfigParams[0] = SetConfigParam({
            eid: activeNetworkConfig.dstEid,
            configType: ULN_CONFIG_TYPE,
            config: abi.encode(ulnConfig)
        });

        sendLibraryAddress = ILayerZeroEndpointV2(activeNetworkConfig.endpoint).getSendLibrary(
            proxy,
            activeNetworkConfig.dstEid
        );
        (receiveLibraryAddress, ) = ILayerZeroEndpointV2(activeNetworkConfig.endpoint).getReceiveLibrary(
            proxy,
            activeNetworkConfig.dstEid
        );
    }
}
