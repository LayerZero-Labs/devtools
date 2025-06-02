import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniPoint } from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import OApp from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/oapp/OApp.sol/OApp.json'
import OAppOptionsType3 from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/oapp/libs/OAppOptionsType3.sol/OAppOptionsType3.json'
import EndpointV2Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/EndpointV2.json'
import ReceiveUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/ReceiveUln302.json'
import SendUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/SendUln302.json'
import EndpointV2Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/EndpointV2.json'
import ReceiveUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/ReceiveUln302.json'
import SendUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/SendUln302.json'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { OAppOmniGraphHardhatSchema } from '@layerzerolabs/ua-devtools-evm-hardhat'

import { getTronReceiveConfig, getTronSendConfig, initTronWeb } from '../common/taskHelper'
import { findTronEndpointIdInGraph } from '../common/utils'

// Import deployment artifacts from LayerZero SDK

const logger = createLogger()

// Configuration types
const EXECUTOR_CONFIG_TYPE = 1
const ULN_CONFIG_TYPE = 2

interface Args {
    oappConfig: string
    privateKey: string
}

export default async function wireTron(args: Args, hre: HardhatRuntimeEnvironment) {
    const { oappConfig, privateKey } = args

    if (!oappConfig) throw new Error('Missing oappConfig')
    if (!privateKey) throw new Error('Missing privateKey')

    let graph: OAppOmniGraph
    try {
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }

    // Find Tron endpoint ID in the graph
    const tronEid = await findTronEndpointIdInGraph(hre, oappConfig)
    const isMainnet = tronEid === EndpointId.TRON_V2_MAINNET

    // Get the correct deployment artifacts based on network
    const endpointV2 = isMainnet ? EndpointV2Mainnet : EndpointV2Testnet
    const sendUln302 = isMainnet ? SendUln302Mainnet : SendUln302Testnet
    const receiveUln302 = isMainnet ? ReceiveUln302Mainnet : ReceiveUln302Testnet

    // Initialize TronWeb
    const tronWeb = initTronWeb(isMainnet ? 'mainnet' : 'testnet', privateKey)

    // Create SDK factory for EVM chains
    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())

    // Wire the OApp
    for (const { vector } of graph.connections) {
        const { from, to } = vector
        const fromIsTron = isTron(from)
        const toIsTron = isTron(to)

        if (fromIsTron || toIsTron) {
            // For Tron connections, we'll handle the wiring manually
            if (fromIsTron) {
                // Get the OApp contract instance
                const oappContract = await tronWeb.contract(OApp.abi, from.address)
                const endpoint = await tronWeb.contract(endpointV2.abi, endpointV2.address)

                // Initialize send library if not already initialized
                const sendConfig = await getTronSendConfig(tronWeb, to.eid, from.address)
                if (!sendConfig) {
                    logger.verbose(`Initializing send library for ${from.eid} -> ${to.eid}`)
                    await endpoint.setSendLibrary(from.address, to.eid, sendUln302.address).send()

                    // Set ULN config if provided
                    if (sendConfig?.[1]) {
                        logger.verbose(`Setting ULN config for ${from.eid} -> ${to.eid}`)
                        const ulnConfig = [
                            {
                                eid: to.eid,
                                configType: ULN_CONFIG_TYPE,
                                config: sendConfig[1],
                            },
                        ]
                        await endpoint.setConfig(from.address, sendUln302.address, ulnConfig).send()
                    }

                    // Set executor config if provided
                    if (sendConfig?.[2]) {
                        logger.verbose(`Setting executor config for ${from.eid} -> ${to.eid}`)
                        const executorConfig = [
                            {
                                eid: to.eid,
                                configType: EXECUTOR_CONFIG_TYPE,
                                config: sendConfig[2],
                            },
                        ]
                        await endpoint.setConfig(from.address, sendUln302.address, executorConfig).send()
                    }
                }

                // Set peer address
                logger.verbose(`Setting peer address for ${from.eid} -> ${to.eid}`)
                await oappContract.setPeer(to.eid, to.address).send()

                // Set enforced options if provided in the config
                const enforcedOptions = (vector as any).config?.enforcedOptions
                if (enforcedOptions) {
                    logger.verbose(`Setting enforced options for ${from.eid} -> ${to.eid}`)
                    const optionsContract = await tronWeb.contract(OAppOptionsType3.abi, from.address)
                    await optionsContract.setEnforcedOptions(enforcedOptions).send()
                }
            }

            if (toIsTron) {
                // Get the OApp contract instance
                const oappContract = await tronWeb.contract(OApp.abi, to.address)
                const endpoint = await tronWeb.contract(endpointV2.abi, endpointV2.address)

                // Initialize receive library if not already initialized
                const receiveConfig = await getTronReceiveConfig(tronWeb, from.eid, to.address)
                if (!receiveConfig) {
                    logger.verbose(`Initializing receive library for ${to.eid} <- ${from.eid}`)
                    await endpoint.setReceiveLibrary(to.address, from.eid, receiveUln302.address, BigInt(0)).send()

                    // Set ULN config if provided
                    if (receiveConfig?.[1]) {
                        logger.verbose(`Setting ULN config for ${to.eid} <- ${from.eid}`)
                        const ulnConfig = [
                            {
                                eid: from.eid,
                                configType: ULN_CONFIG_TYPE,
                                config: receiveConfig[1],
                            },
                        ]
                        await endpoint.setConfig(to.address, receiveUln302.address, ulnConfig).send()
                    }

                    // Set timeout config if provided
                    if (receiveConfig?.[2]) {
                        const timeout = receiveConfig[2] as Timeout
                        logger.verbose(`Setting timeout config for ${to.eid} <- ${from.eid}`)
                        await endpoint
                            .setReceiveLibraryTimeout(to.address, from.eid, receiveUln302.address, timeout.expiry)
                            .send()
                    }
                }

                // Set peer address
                logger.verbose(`Setting peer address for ${to.eid} <- ${from.eid}`)
                await oappContract.setPeer(from.eid, from.address).send()

                // Set enforced options if provided in the config
                const enforcedOptions = (vector as any).config?.enforcedOptions
                if (enforcedOptions) {
                    logger.verbose(`Setting enforced options for ${to.eid} <- ${from.eid}`)
                    const optionsContract = await tronWeb.contract(OAppOptionsType3.abi, to.address)
                    await optionsContract.setEnforcedOptions(enforcedOptions).send()
                }
            }
        } else {
            // For EVM connections, use the SDK
            const fromSdk = await evmSdkFactory(from)
            const toSdk = await evmSdkFactory(to)

            // Set peer addresses
            await fromSdk.setPeer(to.eid, to.address)
            await toSdk.setPeer(from.eid, from.address)

            // Set enforced options if provided in the config
            const enforcedOptions = (vector as any).config?.enforcedOptions
            if (enforcedOptions) {
                await fromSdk.setEnforcedOptions(enforcedOptions)
                await toSdk.setEnforcedOptions(enforcedOptions)
            }
        }
    }
}

function isTron(point: OmniPoint): boolean {
    return point.eid === EndpointId.TRON_V2_MAINNET || point.eid === EndpointId.TRON_V2_TESTNET
}
