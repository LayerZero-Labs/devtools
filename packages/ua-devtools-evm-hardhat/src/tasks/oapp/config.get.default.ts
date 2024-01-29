import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printRecord } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { TASK_LZ_OAPP_CONFIG_GET_DEFAULT } from '@/constants'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { getEidsByNetworkName, types } from '@layerzerolabs/devtools-evm-hardhat'

interface TaskArgs {
    logLevel?: string
    networks?: string[]
}

export const getDefaultConfig: ActionType<TaskArgs> = async (
    { logLevel = 'info', networks: networksArgument },
    hre
) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const networks =
        networksArgument ??
        Object.entries(getEidsByNetworkName(hre)).flatMap(([networkName, eid]) => (eid == null ? [] : [networkName]))

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
    .addOptionalParam('networks', 'comma separated list of networks', undefined, types.networks)
    .setAction(getDefaultConfig)
