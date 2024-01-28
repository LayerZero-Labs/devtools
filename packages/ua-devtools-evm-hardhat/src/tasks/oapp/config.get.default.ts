import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { printRecord } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { TASK_LZ_OAPP_CONFIG_GET_DEFAULT } from '@/constants'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'

interface TaskArgs {
    logLevel?: string
    networks?: string
}

export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs, hre) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(taskArgs.logLevel ?? 'info')
    let networks
    if (taskArgs?.networks != null) {
        networks = new Set(taskArgs.networks.split(','))
    } else {
        networks = Object.keys(hre.userConfig.networks ?? {})
    }
    const configs: Record<string, Record<string, unknown>> = {}
    for (const localNetworkName of networks) {
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) continue

            const receiveConfig = await getReceiveConfig(localNetworkName, remoteNetworkName)
            const sendConfig = await getSendConfig(localNetworkName, remoteNetworkName)

            const [sendLibrary, sendUlnConfig, sendExecutorConfig] = sendConfig ?? []
            const [receiveLibrary, receiveUlnConfig] = receiveConfig ?? []

            configs[localNetworkName]![remoteNetworkName] = {
                defaultSendLibrary: sendLibrary,
                defaultReceiveLibrary: receiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig,
            }

            console.log(
                printRecord({
                    localNetworkName,
                    remoteNetworkName,
                    sendLibrary,
                    receiveLibrary,
                    sendUlnConfig,
                    sendExecutorConfig,
                    receiveUlnConfig,
                })
            )
        }
    }
    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET_DEFAULT,
    'Outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.string)
    .addOptionalParam('networks', 'comma separated list of networks', undefined, types.string)
    .setAction(getDefaultConfig)
