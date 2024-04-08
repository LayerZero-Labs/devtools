import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printCrossTable } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, TASK_LZ_OAPP_CONFIG_GET } from '@/constants/tasks'
import assert from 'assert'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import type { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { getNetworkNameForEid, types } from '@layerzerolabs/devtools-evm-hardhat'
import { OAppOmniGraphHardhatSchema } from '@/oapp'
import type { SubtaskLoadConfigTaskArgs } from './types'

interface TaskArgs {
    logLevel?: string
    oappConfig: string
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', oappConfig }, hre) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const networks: string[] = []
    const addresses: string[] = []
    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_CONFIG_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    graph.contracts.forEach((contract) => {
        networks.push(getNetworkNameForEid(contract.point.eid))
        addresses.push(contract.point.address)
    })

    assert(
        networks.length != 0,
        'Please provide a valid list of networks & addresses or a path to your LayerZero OApp config.'
    )
    assert(networks.length === addresses.length, 'Passed in networks must match length of passed in addresses.')
    const configs: Record<string, Record<string, unknown>> = {}

    for (const [index, localNetworkName] of networks.entries()) {
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) {
                continue
            }

            // OApp User Set Config
            const receiveCustomConfig = await getReceiveConfig(
                localNetworkName,
                remoteNetworkName,
                addresses[index],
                true
            )
            const sendCustomConfig = await getSendConfig(localNetworkName, remoteNetworkName, addresses[index], true)
            const [sendCustomLibrary, sendCustomUlnConfig, sendCustomExecutorConfig] = sendCustomConfig ?? []
            const [receiveCustomLibrary, receiveCustomUlnConfig] = receiveCustomConfig ?? []

            // Default Config
            const receiveDefaultConfig = await getReceiveConfig(localNetworkName, remoteNetworkName)
            const sendDefaultConfig = await getSendConfig(localNetworkName, remoteNetworkName)
            const [sendDefaultLibrary, sendDefaultUlnConfig, sendDefaultExecutorConfig] = sendDefaultConfig ?? []
            const [receiveDefaultLibrary, receiveDefaultUlnConfig] = receiveDefaultConfig ?? []

            // OApp Config
            const receiveOAppConfig = await getReceiveConfig(localNetworkName, remoteNetworkName, addresses[index])
            const sendOAppConfig = await getSendConfig(localNetworkName, remoteNetworkName, addresses[index])
            const [sendOAppLibrary, sendOAppUlnConfig, sendOAppExecutorConfig] = sendOAppConfig ?? []
            const [receiveOAppLibrary, receiveOAppUlnConfig] = receiveOAppConfig ?? []

            configs[localNetworkName]![remoteNetworkName] = {
                defaultSendLibrary: sendOAppLibrary,
                defaultReceiveLibrary: receiveOAppLibrary,
                sendUlnConfig: sendOAppUlnConfig,
                sendExecutorConfig: sendOAppExecutorConfig,
                receiveUlnConfig: receiveOAppUlnConfig,
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
        }
    }
    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET,
    'Outputs Custom OApp Config, Default OApp Config, and Active OApp Config. Each config contains Send & Receive Libraries, Send Uln & Executor Configs, and Receive Executor Configs',
    action
)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
