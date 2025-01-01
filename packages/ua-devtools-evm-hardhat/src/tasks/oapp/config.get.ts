import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { createLogger, printCrossTable } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, TASK_LZ_OAPP_CONFIG_GET } from '@/constants/tasks'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { createConnectedContractFactory, getNetworkNameForEid, types } from '@layerzerolabs/devtools-evm-hardhat'
import { OAppOmniGraphHardhatSchema } from '@/oapp'
import type { SubtaskLoadConfigTaskArgs } from './types'
import { createDefaultApplicative } from '@layerzerolabs/devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'

interface TaskArgs {
    logLevel?: string
    oappConfig: string
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', oappConfig }, hre) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // We'll do some logging as we go
    const logger = createLogger(logLevel)

    // We'll load and process the graph, resolving the addresses in the process
    const graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_CONFIG_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    // Now let's prepare some connectors
    const sdkFactory = createOAppFactory(createConnectedContractFactory())

    // And a container to store the results
    const configs: Record<string, Record<string, unknown>> = {}

    // Now we go over the graph and collect the configs
    const tasks = graph.connections.map(({ vector: { from, to } }) => async () => {
        const oAppSdk = await sdkFactory(from)
        const endpointV2Sdk = await oAppSdk.getEndpointSDK()

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

    // We allow this script to be executed either in parallel or in series
    const applicative = createDefaultApplicative(logger)
    await applicative(tasks)

    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET,
    'Outputs Custom OApp Config, Default OApp Config, and Active OApp Config. Each config contains Send & Receive Libraries, Send Uln & Executor Configs, and Receive Executor Configs',
    action
)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
