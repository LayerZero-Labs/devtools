// tasks/ConfigGet.ts

import { task } from 'hardhat/config'
import { ActionType } from 'hardhat/types'

import { EndpointBasedFactory, OmniPoint, createDefaultApplicative } from '@layerzerolabs/devtools'
import {
    createConnectedContractFactory,
    createGetHreByEid,
    getNetworkNameForEid,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger, printCrossTable, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { ChainType, EndpointId, endpointIdToChainType, endpointIdToVersion } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { getReceiveConfig, getSendConfig } from '@layerzerolabs/ua-devtools-evm-hardhat'

import {
    getEpv1DefaultExecutorConfig,
    getEpv1DefaultReceiveConfig,
    getEpv1DefaultReceiveLibraryAddress,
    getEpv1DefaultSendConfig,
    getEpv1DefaultSendLibraryAddress,
    getEpv1ExecutorConfig,
    getEpv1ReceiveLibraryAddress,
    getEpv1ReceiveUlnConfig,
    getEpv1SendLibraryAddress,
    getEpv1SendUlnConfig,
} from './taskHelper'

interface TaskArgs {
    logLevel?: string
    oappConfig: string
}

/**
 * Helper function to get the hardhat.config.ts network name for a given endpoint id.
 * @param eid {EndpointId}
 */
const getEid = (eid: EndpointId) => {
    return getNetworkNameForEid(eid)
}

/**
 * Helper function to determine if the point is EndpointV1
 * @param point {OmniPoint}
 */
const isEndpointV1Eid = (point: OmniPoint): boolean => endpointIdToVersion(point.eid) === 'v1'

const isEndpointV2Eid = (point: OmniPoint): boolean => endpointIdToVersion(point.eid) === 'v2'

/**
 * Helper function to determine if the point is EVM-based
 * @param point {OmniPoint}
 */
const isEvmEndpoint = (point: OmniPoint): boolean => {
    const chainType = endpointIdToChainType(point.eid)
    return chainType === ChainType.EVM // Adjust based on actual ChainType enumeration
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', oappConfig }, hre) => {
    setDefaultLogLevel(logLevel)
    const logger = createLogger(logLevel)

    // Load the OApp OmniGraph configuration
    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_CONFIG_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    // Initialize the EndpointBasedFactory using the provided hre
    const getHreByEid: EndpointBasedFactory<typeof hre> = createGetHreByEid(hre) as EndpointBasedFactory<typeof hre>

    // Create SDK factory
    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())

    // Store configurations
    const configs: Record<string, Record<string, unknown>> = {}

    // Iterate over the graph of connections
    const epv2Tasks = graph.connections
        .filter(({ vector: { from } }) => isEndpointV2Eid(from) && isEvmEndpoint(from))
        .map(({ vector: { from, to } }) => async () => {
            const endpointV2Sdk = await (await evmSdkFactory(from)).getEndpointSDK()

            // Fetch configurations with custom flags as needed
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

    const epv1Tasks = graph.connections
        .filter(({ vector: { from } }) => isEndpointV1Eid(from) && isEvmEndpoint(from))
        .map(({ vector: { from, to } }) => async () => {
            const hreForEid = await getHreByEid(from.eid)
            if (!hreForEid) {
                logger.error(`Failed to obtain hre for EID ${from.eid}`)
                return
            }

            // Fetch configurations based on EID version
            if (isEndpointV1Eid(from)) {
                // Active configurations
                const executorConfig = await getEpv1ExecutorConfig(hreForEid, to.eid, from.address)
                const sendUlnConfig = await getEpv1SendUlnConfig(hreForEid, to.eid, from.address)
                const sendLibraryAddress = await getEpv1SendLibraryAddress(hreForEid, from.address)
                const receiveUlnConfig = await getEpv1ReceiveUlnConfig(hreForEid, to.eid, from.address)
                const receiveLibraryAddress = await getEpv1ReceiveLibraryAddress(hreForEid, to.eid, from.address)

                // if (!executorConfig || sendUlnConfig || !receiveUlnConfig || !sendLibraryAddress || !receiveLibraryAddress) {
                //     logger.error(`Failed to fetch EPV1 configurations for EID ${from.eid} to EID ${to.eid}`)
                //     return
                // }

                // Default Config
                const defaultReceiveLibrary = await getEpv1DefaultReceiveLibraryAddress(hreForEid)
                const defaultSendLibrary = await getEpv1DefaultSendLibraryAddress(hreForEid)
                const defaultExecutorConfig = await getEpv1DefaultExecutorConfig(hreForEid, to.eid)
                const defaultSendUlnConfig = await getEpv1DefaultSendConfig(hreForEid, to.eid)
                const defaultReceiveUlnConfig = await getEpv1DefaultReceiveConfig(hreForEid, to.eid)

                const localNetworkName = getNetworkNameForEid(from.eid)
                const remoteNetworkName = getNetworkNameForEid(to.eid)

                // Update the global state
                configs[localNetworkName] = {
                    ...configs[localNetworkName],
                    [remoteNetworkName]: {
                        defaultSendLibrary: sendLibraryAddress,
                        defaultReceiveLibrary: receiveLibraryAddress,
                        sendUlnConfig: sendUlnConfig,
                        sendExecutorConfig: executorConfig,
                        receiveUlnConfig: receiveUlnConfig,
                    },
                }

                // Logging the configurations
                logger.info(
                    printCrossTable(
                        [
                            {
                                localNetworkName,
                                remoteNetworkName,
                                sendLibrary: sendLibraryAddress,
                                receiveLibrary: receiveLibraryAddress,
                                sendUlnConfig: sendUlnConfig,
                                sendExecutorConfig: executorConfig,
                                receiveUlnConfig: receiveUlnConfig,
                            },
                            {
                                localNetworkName,
                                remoteNetworkName,
                                sendLibrary: defaultSendLibrary,
                                receiveLibrary: defaultReceiveLibrary,
                                sendUlnConfig: defaultSendUlnConfig,
                                sendExecutorConfig: defaultExecutorConfig,
                                receiveUlnConfig: defaultReceiveUlnConfig,
                            },
                            {
                                localNetworkName,
                                remoteNetworkName,
                                sendLibrary: sendLibraryAddress,
                                receiveLibrary: receiveLibraryAddress,
                                sendUlnConfig: sendUlnConfig,
                                sendExecutorConfig: executorConfig,
                                receiveUlnConfig: receiveUlnConfig,
                            },
                        ],
                        ['', 'Custom OApp Config', 'Default OApp Config', 'Active OApp Config']
                    )
                )
            }
        })

    // Combine EPV2 and EPV1 tasks
    const allTasks = [...epv2Tasks, ...epv1Tasks]

    // Execute all tasks sequentially
    const applicative = createDefaultApplicative(logger)
    await applicative(allTasks)

    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET,
    'Outputs OApp Configurations including Send & Receive Libraries, Send ULN & Executor Configs, and Receive ULN Configs',
    action
)
