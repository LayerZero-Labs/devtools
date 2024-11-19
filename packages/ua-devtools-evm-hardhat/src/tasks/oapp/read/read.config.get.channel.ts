import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { createLogger, printJson, printRecord, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import {
    assertDefinedNetworks,
    createOmniPointHardhatTransformer,
    createProviderFactory,
    getEidForNetworkName,
    getEidsByNetworkName,
    types,
} from '@layerzerolabs/devtools-evm-hardhat'
import { OAppReadNodeConfig } from '@layerzerolabs/ua-devtools'
import { createEndpointV2Factory } from '@layerzerolabs/protocol-devtools-evm'

import { getReadConfig } from '@/utils/taskHelpers'
import { TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL } from '@/constants'

interface TaskArgs {
    logLevel?: string
    networks?: string[]
    json?: boolean
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', networks: networksArgument, json }, hre) => {
    printLogo()
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)
    const logger = createLogger()

    const networks = networksArgument
        ? // Here we need to check whether the networks have been defined in hardhat config
          assertDefinedNetworks(networksArgument)
        : //  But here we are taking them from hardhat config so no assertion is necessary
          Object.entries(getEidsByNetworkName(hre)).flatMap(([networkName, eid]) => (eid == null ? [] : [networkName]))

    const pointTransformer = createOmniPointHardhatTransformer()
    const endpointV2Factory = createEndpointV2Factory(createProviderFactory())

    const configs: Record<string, Record<string, unknown>> = {}
    for (const localNetworkName of networks) {
        const localEid = getEidForNetworkName(localNetworkName)

        const endpointV2OmniPoint = await pointTransformer({ eid: localEid, contractName: 'EndpointV2' })
        const endpointV2Sdk = await endpointV2Factory(endpointV2OmniPoint)
        const readConfig = await getReadConfig(endpointV2Sdk)

        if (readConfig == null) {
            logger.warn(`Read Config is undefined for network ${localNetworkName}(${localEid})`)
            continue
        }

        for (const [readLibrary, readUlnConfig, channelId] of readConfig) {
            if (readLibrary == null) {
                logger.warn(
                    `ReadLibrary is undefined for network ${localNetworkName}(${localEid}) and channel ${channelId}`
                )
                continue
            }

            if (readUlnConfig == null) {
                logger.warn(
                    `ReadUlnConfig is undefined for network ${localNetworkName}(${localEid}) and channel ${channelId}`
                )
                continue
            }

            configs[localNetworkName] = {
                ...configs[localNetworkName],
                [channelId]: {
                    defaultReadLibrary: readLibrary,
                    readUlnConfig: readUlnConfig,
                },
            }
        }

        if (json) {
            const config: OAppReadNodeConfig = {
                readChannelConfigs: readConfig.map(([readLibrary, readUlnConfig, channelId]) => ({
                    channelId,
                    readLibrary,
                    readUlnConfig,
                })),
            }
            console.log(`${localNetworkName}(${localEid})\n`, printJson(config))
        } else {
            console.log(
                printRecord({
                    localNetworkName,
                    readChannelConfigs: readConfig.map(([readLibrary, readUlnConfig, channelId]) => ({
                        channelId,
                        readLibrary,
                        readUlnConfig,
                    })),
                })
            )
        }
    }
    return configs
}

task(
    TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL,
    'Outputs the Default OApp Read Channel Config. Each config contains read channels, default libraries, and Uln configs',
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
