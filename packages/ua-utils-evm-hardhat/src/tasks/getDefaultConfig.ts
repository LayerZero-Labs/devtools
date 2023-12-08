import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { getReceiveConfig, getSendConfig, printConsoleTable } from '@/utils/taskHelpers'

interface TaskArgs {
    networks: string
}

export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs) => {
    const networks = new Set(taskArgs.networks.split(','))
    const configs: Record<string, Record<string, unknown>> = {}
    for (const localNetworkName of networks) {
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) continue
            const [sendLibrary, sendUlnConfig, sendExecutorConfig] = await getSendConfig(
                localNetworkName,
                remoteNetworkName
            )
            const [receiveLibrary, receiveUlnConfig] = await getReceiveConfig(localNetworkName, remoteNetworkName)

            configs[localNetworkName][remoteNetworkName] = {
                defaultSendLibrary: sendLibrary,
                defaultReceiveLibrary: receiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig,
            }

            printConsoleTable(
                localNetworkName,
                remoteNetworkName,
                sendLibrary,
                receiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig
            )
        }
    }
    return configs
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
