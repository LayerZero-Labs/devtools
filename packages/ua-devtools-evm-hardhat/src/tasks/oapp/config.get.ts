import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { printRecord } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { TASK_LZ_OAPP_CONFIG_GET } from '@/constants/tasks'
import assert from 'assert'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'

interface TaskArgs {
    logLevel?: string
    networks: string
    addresses: string
}

export const getOAppConfig: ActionType<TaskArgs> = async (taskArgs) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(taskArgs.logLevel ?? 'info')

    const networks = taskArgs.networks.split(',')
    const addresses = taskArgs.addresses.split(',')
    assert(networks.length === addresses.length, 'Passed in networks must match length of passed in addresses.')
    const configs: Record<string, Record<string, unknown>> = {}

    for (const [index, localNetworkName] of networks.entries()) {
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) continue

            const receiveConfig = await getReceiveConfig(localNetworkName, remoteNetworkName, addresses[index])
            const sendConfig = await getSendConfig(localNetworkName, remoteNetworkName, addresses[index])

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
    TASK_LZ_OAPP_CONFIG_GET,
    'Outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks', undefined, types.string)
    .addParam('addresses', 'comma separated list of addresses', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.string)
    .setAction(getOAppConfig)
