import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printRecord } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { TASK_LZ_GET_DEFAULT_CONFIG } from '@/constants'

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
    TASK_LZ_GET_DEFAULT_CONFIG,
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
