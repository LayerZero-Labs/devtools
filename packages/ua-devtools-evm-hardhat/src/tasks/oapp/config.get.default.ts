import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { createLogger, printJson, printRecord } from '@layerzerolabs/io-devtools'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { TASK_LZ_OAPP_CONFIG_GET_DEFAULT } from '@/constants'
import { setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import {
    assertDefinedNetworks,
    getEidForNetworkName,
    getEidsByNetworkName,
    types,
} from '@layerzerolabs/devtools-evm-hardhat'
import { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'

interface TaskArgs {
    logLevel?: string
    networks?: string[]
    json?: boolean
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', networks: networksArgument, json }, hre) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)
    const logger = createLogger()

    const networks = networksArgument
        ? // Here we need to check whether the networks have been defined in hardhat config
          assertDefinedNetworks(networksArgument)
        : //  But here a=we are taking them from hardhat config so no assertion is necessary
          Object.entries(getEidsByNetworkName(hre)).flatMap(([networkName, eid]) => (eid == null ? [] : [networkName]))

    const configs: Record<string, Record<string, unknown>> = {}
    for (const localNetworkName of networks) {
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) {
                continue
            }

            const receiveConfig = await getReceiveConfig(localNetworkName, remoteNetworkName)
            const sendConfig = await getSendConfig(localNetworkName, remoteNetworkName)

            const [sendLibrary, sendUlnConfig, sendExecutorConfig] = sendConfig ?? []
            const [receiveLibrary, receiveUlnConfig] = receiveConfig ?? []

            const localEid = getEidForNetworkName(localNetworkName)
            const remoteEid = getEidForNetworkName(remoteNetworkName)
            if (sendLibrary == null) {
                logger.warn(
                    `SendLibrary is undefined for pathway ${localNetworkName}(${localEid}) -> ${remoteNetworkName}(${remoteEid})`
                )
                continue
            } else if (receiveLibrary == null) {
                logger.warn(
                    `ReceiveLibrary is undefined for pathway ${remoteNetworkName}(${remoteEid}) -> ${localNetworkName}(${localEid})`
                )
                continue
            } else if (sendUlnConfig == null) {
                logger.warn(
                    `Send Uln Config is undefined for pathway ${localNetworkName}(${localEid}) -> ${remoteNetworkName}(${remoteEid})`
                )
                continue
            } else if (sendExecutorConfig == null) {
                logger.warn(
                    `Send Executor Config is undefined for pathway $${localNetworkName}(${localEid}) -> ${remoteNetworkName}(${remoteEid})`
                )
                continue
            } else if (receiveUlnConfig == null) {
                logger.warn(
                    `Receive Uln Config is undefined for pathway ${remoteNetworkName}(${remoteEid}) -> ${localNetworkName}(${localEid})`
                )
                continue
            }

            configs[localNetworkName]![remoteNetworkName] = {
                defaultSendLibrary: sendLibrary,
                defaultReceiveLibrary: receiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig,
            }

            if (json) {
                const config: OAppEdgeConfig = {
                    sendLibrary: sendLibrary,
                    receiveLibraryConfig: {
                        receiveLibrary,
                        gracePeriod: BigInt(0),
                    },
                    sendConfig: {
                        executorConfig: sendExecutorConfig,
                        ulnConfig: sendUlnConfig,
                    },
                    receiveConfig: {
                        ulnConfig: receiveUlnConfig,
                    },
                }

                console.log(
                    `${localNetworkName}(${localEid}) -> ${remoteNetworkName}(${remoteEid})\n`,
                    printJson(config)
                )
            } else {
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
    }
    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET_DEFAULT,
    'Outputs the Default OApp Config. Each config contains Send & Receive Libraries, Send Uln & Executor Configs, and Receive Executor Configs',
    action
)
    .addParam('networks', 'Comma-separated list of networks', undefined, types.csv, true)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam(
        'json',
        'Print result as JSON that can be used directly in your LayerZero OApp config',
        false,
        types.boolean,
        true
    )
