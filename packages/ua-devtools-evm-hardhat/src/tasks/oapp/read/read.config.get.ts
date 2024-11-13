import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { createLogger, printCrossTable } from '@layerzerolabs/io-devtools'
import { getReadConfig, getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, TASK_LZ_OAPP_READ_CONFIG_GET } from '@/constants/tasks'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { createConnectedContractFactory, getNetworkNameForEid, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createDefaultApplicative } from '@layerzerolabs/devtools'
import { createOAppReadFactory } from '@layerzerolabs/ua-devtools-evm'
import { OAppReadOmniGraphHardhatSchema } from '@/oapp-read'

interface TaskArgs {
    logLevel?: string
    oappConfig: string
}

// TODO READ: This task is just copying and change some parameters from config.get.ts, make them more generic
const action: ActionType<TaskArgs> = async ({ logLevel = 'info', oappConfig }, hre) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // We'll do some logging as we go
    const logger = createLogger(logLevel)

    // We'll load and process the graph, resolving the addresses in the process
    const graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppReadOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_READ_CONFIG_GET,
    })

    // Now let's prepare some connectors
    const sdkFactory = createOAppReadFactory(createConnectedContractFactory())

    // And a container to store the results
    const configs: Record<string, Record<string, unknown>> = {}

    // Now we go over the graph and collect the configs
    const tasks = graph.connections.map(({ vector: { from, to } }) => async () => {
        const oAppSdk = await sdkFactory(from)
        const endpointV2Sdk = await oAppSdk.getEndpointSDK()

        // OApp User Set Config
        const receiveCustomConfig = await getReceiveConfig(endpointV2Sdk, to.eid, to.address, true)
        const sendCustomConfig = await getSendConfig(endpointV2Sdk, to.eid, to.address, true)
        const [sendCustomLibrary, sendCustomUlnConfig, sendCustomExecutorConfig] = sendCustomConfig ?? []
        const [receiveCustomLibrary, receiveCustomUlnConfig] = receiveCustomConfig ?? []

        // Default Config
        const receiveDefaultConfig = await getReceiveConfig(endpointV2Sdk, to.eid)
        const sendDefaultConfig = await getSendConfig(endpointV2Sdk, to.eid)
        const [sendDefaultLibrary, sendDefaultUlnConfig, sendDefaultExecutorConfig] = sendDefaultConfig ?? []
        const [receiveDefaultLibrary, receiveDefaultUlnConfig] = receiveDefaultConfig ?? []

        // OApp Config
        const receiveOAppConfig = await getReceiveConfig(endpointV2Sdk, to.eid, to.address)
        const sendOAppConfig = await getSendConfig(endpointV2Sdk, to.eid, to.address)
        const [sendOAppLibrary, sendOAppUlnConfig, sendOAppExecutorConfig] = sendOAppConfig ?? []
        const [receiveOAppLibrary, receiveOAppUlnConfig] = receiveOAppConfig ?? []

        const localNetworkName = getNetworkNameForEid(from.eid)
        const remoteNetworkName = getNetworkNameForEid(to.eid)

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

    // For lzRead, we'll also go over the read channels configs
    tasks.push(
        ...graph.contracts.map(({ point, config }) => async () => {
            const oAppReadSdk = await sdkFactory(point)
            const endpointV2Sdk = await oAppReadSdk.getEndpointSDK()

            if (config?.readChannelConfigs == null) {
                return
            }

            const channelIds = config.readChannelConfigs.map(({ channelId }) => channelId)

            // OApp User Set Config
            const readCustomConfig = await getReadConfig(endpointV2Sdk, channelIds, point.address, true)

            // Default Config
            const readDefaultConfig = await getReadConfig(endpointV2Sdk, channelIds)

            // OApp Config
            const readOAppConfig = await getReadConfig(endpointV2Sdk, channelIds, point.address)

            const localNetworkName = getNetworkNameForEid(point.eid)

            for (let i = 0; i < channelIds.length; i++) {
                const channelId = channelIds[i]
                const [readCustomLibrary, readCustomUlnConfig, customChannelId] = (readCustomConfig ?? [])[i] ?? []
                const [readDefaultLibrary, readDefaultUlnConfig, defaultChannelId] = (readDefaultConfig ?? [])[i] ?? []
                const [readOAppLibrary, readOAppUlnConfig, oAppChannelId] = (readOAppConfig ?? [])[i] ?? []

                // Update the global state
                configs[localNetworkName] = {
                    ...configs[localNetworkName],
                    [channelId!]: {
                        defaultReadLibrary: readOAppLibrary,
                        readUlnConfig: readOAppUlnConfig,
                    },
                }

                console.log(
                    printCrossTable(
                        [
                            {
                                localNetworkName,
                                channelId: customChannelId,
                                readLibrary: readCustomLibrary,
                                readUlnConfig: readCustomUlnConfig,
                            },
                            {
                                localNetworkName,
                                channelId: defaultChannelId,
                                readLibrary: readDefaultLibrary,
                                readUlnConfig: readDefaultUlnConfig,
                            },
                            {
                                localNetworkName,
                                channelId: oAppChannelId,
                                readLibrary: readOAppLibrary,
                                readUlnConfig: readOAppUlnConfig,
                            },
                        ],
                        ['', 'Custom OApp Read Config', 'Default OApp Read Config', 'Active OApp Read Config']
                    )
                )
            }
        })
    )

    // We allow this script to be executed either in parallel or in series
    const applicative = createDefaultApplicative(logger)
    await applicative(tasks)

    return configs
}

task(
    TASK_LZ_OAPP_READ_CONFIG_GET,
    'Outputs Custom OApp Config, Default OApp Config, and Active OApp Config. Each config contains Send & Receive Libraries, Send Uln & Executor Configs, and Receive Executor Configs',
    action
)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
