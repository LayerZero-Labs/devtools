import { task } from 'hardhat/config'
import { ActionType } from 'hardhat/types'

import { OmniPoint, createDefaultApplicative } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger, printCrossTable, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { getReceiveConfig, getSendConfig } from '@layerzerolabs/ua-devtools-evm-hardhat'

import { getTronReceiveConfig, getTronSendConfig, initTronWeb } from './taskHelper'

interface TaskArgs {
    logLevel?: string
    oappConfig: string
    privateKey?: string
}

/**
 * Helper function to determine if the point is Tron
 * @param point {OmniPoint}
 */
const isTron = (point: OmniPoint) =>
    point.eid === EndpointId.TRON_V2_TESTNET || point.eid === EndpointId.TRON_V2_MAINNET

/**
 * Helper function to get the hardhat.config.ts network name for a given endpoint id
 * @param eid {EndpointId}
 */
const getEid = (eid: EndpointId) => {
    switch (eid) {
        // For Tron networks, we'll use the convention of networkName-environment
        case EndpointId.TRON_V2_MAINNET:
        case EndpointId.TRON_V2_TESTNET: {
            const { chainName, env } = getNetworkForChainId(eid)
            return `${chainName}-${env}`
        }
        default:
            // For all other chains, we'll use the network name from hardhat.config.ts
            return getNetworkNameForEid(eid)
    }
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', oappConfig, privateKey }, hre) => {
    setDefaultLogLevel(logLevel)
    const logger = createLogger(logLevel)

    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_CONFIG_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())
    const configs: Record<string, Record<string, unknown>> = {}

    // Iterate over the graph of connections not from Tron
    const tasks = graph.connections
        .filter(({ vector: { from } }) => !isTron(from))
        .map(({ vector: { from, to } }) => async () => {
            const endpointV2Sdk = await (await evmSdkFactory(from)).getEndpointSDK()

            // OApp User Set Config
            const receiveCustomConfig = await getReceiveConfig(endpointV2Sdk, to.eid, from.address, true)
            const sendCustomConfig = await getSendConfig(endpointV2Sdk, to.eid, from.address, true)
            const [sendCustomLibrary, sendCustomUlnConfig, sendCustomExecutorConfig] = sendCustomConfig ?? []
            const [receiveCustomLibrary, receiveCustomUlnConfig] = receiveCustomConfig ?? []

            // Default Config
            const receiveDefaultConfig = await getReceiveConfig(endpointV2Sdk, to.eid)
            const sendDefaultConfig = await getSendConfig(endpointV2Sdk, to.eid)
            const [sendDefaultLibrary, sendDefaultUlnConfig, sendDefaultExecutorConfig] = sendDefaultConfig ?? []
            const [receiveDefaultLibrary, receiveDefaultUlnConfig] = receiveDefaultConfig ?? []

            // OApp Config
            const receiveOAppConfig = await getReceiveConfig(endpointV2Sdk, to.eid, from.address)
            const sendOAppConfig = await getSendConfig(endpointV2Sdk, to.eid, from.address)
            const [sendOAppLibrary, sendOAppUlnConfig, sendOAppExecutorConfig] = sendOAppConfig ?? []
            const [receiveOAppLibrary, receiveOAppUlnConfig] = receiveOAppConfig ?? []

            const localNetworkName = getEid(from.eid)
            const remoteNetworkName = getEid(to.eid)

            // Update the global state
            configs[localNetworkName] = {
                ...configs[localNetworkName],
                [remoteNetworkName]: {
                    defaultSendLibrary: sendOAppLibrary,
                    defaultReceiveLibrary: receiveOAppLibrary,
                    sendUlnConfig: sendOAppUlnConfig,
                    sendExecutorConfig: sendOAppExecutorConfig,
                    receiveUlnConfig: receiveOAppUlnConfig,
                },
            }

            console.log(
                printCrossTable(
                    [
                        {
                            localNetworkName,
                            remoteNetworkName,
                            sendLibrary: sendCustomLibrary,
                            receiveLibrary: receiveCustomLibrary,
                            sendUlnConfig: sendCustomUlnConfig,
                            sendExecutorConfig: sendCustomExecutorConfig,
                            receiveUlnConfig: receiveCustomUlnConfig,
                        },
                        {
                            localNetworkName,
                            remoteNetworkName,
                            sendLibrary: sendDefaultLibrary,
                            receiveLibrary: receiveDefaultLibrary,
                            sendUlnConfig: sendDefaultUlnConfig,
                            sendExecutorConfig: sendDefaultExecutorConfig,
                            receiveUlnConfig: receiveDefaultUlnConfig,
                        },
                        {
                            localNetworkName,
                            remoteNetworkName,
                            sendLibrary: sendOAppLibrary,
                            receiveLibrary: receiveOAppLibrary,
                            sendUlnConfig: sendOAppUlnConfig,
                            sendExecutorConfig: sendOAppExecutorConfig,
                            receiveUlnConfig: receiveOAppUlnConfig,
                        },
                    ],
                    ['', 'Custom OApp Config', 'Default OApp Config', 'Active OApp Config']
                )
            )
        })

    // Iterate over the graph of connections from Tron
    const tronTasks = graph.connections
        .filter(({ vector: { from } }) => isTron(from))
        .map(({ vector: { from, to } }) => async () => {
            if (!privateKey) {
                throw new Error('Private key is required for Tron connections')
            }

            const network = from.eid === EndpointId.TRON_V2_MAINNET ? 'mainnet' : 'testnet'
            const tronWeb = initTronWeb(network, privateKey)

            // OApp Config
            const receiveOAppConfig = await getTronReceiveConfig(tronWeb, to.eid, from.address)
            const sendOAppConfig = await getTronSendConfig(tronWeb, to.eid, from.address)
            const [sendOAppLibrary, sendOAppUlnConfig, sendOAppExecutorConfig] = sendOAppConfig ?? []
            const [receiveOAppLibrary, receiveOAppUlnConfig] = receiveOAppConfig ?? []

            const localNetworkName = getEid(from.eid)
            const remoteNetworkName = getEid(to.eid)

            // Update the global state
            configs[localNetworkName] = {
                ...configs[localNetworkName],
                [remoteNetworkName]: {
                    defaultSendLibrary: sendOAppLibrary,
                    defaultReceiveLibrary: receiveOAppLibrary,
                    sendUlnConfig: sendOAppUlnConfig,
                    sendExecutorConfig: sendOAppExecutorConfig,
                    receiveUlnConfig: receiveOAppUlnConfig,
                },
            }

            // For Tron, we only output the active OApp config since defaults are handled differently
            console.log(
                printCrossTable(
                    [
                        {
                            localNetworkName,
                            remoteNetworkName,
                            sendLibrary: sendOAppLibrary,
                            receiveLibrary: receiveOAppLibrary,
                            sendUlnConfig: sendOAppUlnConfig,
                            sendExecutorConfig: sendOAppExecutorConfig,
                            receiveUlnConfig: receiveOAppUlnConfig,
                        },
                    ],
                    ['', 'Active OApp Config']
                )
            )
        })

    // We allow this script to be executed either in parallel or in series
    const applicative = createDefaultApplicative(logger)
    await applicative(tasks)
    await applicative(tronTasks)

    return configs
}

// Instead of redefining the task, we'll use the existing one from the SDK
task(TASK_LZ_OAPP_CONFIG_GET, 'Get OApp configuration', action)
