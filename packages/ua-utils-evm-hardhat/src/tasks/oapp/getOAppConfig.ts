import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printRecord } from '@layerzerolabs/io-utils'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { TASK_LZ_GET_OAPP_CONFIG } from '@/constants/tasks'
import assert from 'assert'

interface TaskArgs {
    networks: string
    addresses: string
}

export const getOAppConfig: ActionType<TaskArgs> = async (taskArgs) => {
    const networks = taskArgs.networks.split(',')
    const addresses = taskArgs.addresses.split(',')
    assert(networks.length === addresses.length, 'Passed in networks must match length of passed in addresses.')
    const configs: Record<string, Record<string, unknown>> = {}

    for (const [index, localNetworkName] of networks.entries()) {
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) continue
            const [sendLibrary, sendUlnConfig, sendExecutorConfig] = await getSendConfig(
                localNetworkName,
                remoteNetworkName,
                addresses[index]
            )
            const [receiveLibrary, receiveUlnConfig] = await getReceiveConfig(
                localNetworkName,
                remoteNetworkName,
                addresses[index]
            )

            configs[localNetworkName][remoteNetworkName] = {
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
    TASK_LZ_GET_OAPP_CONFIG,
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .addParam('addresses', 'comma separated list of addresses')
    .setAction(getOAppConfig)
