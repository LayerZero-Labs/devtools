import { PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'
import { ActionType } from 'hardhat/types'

import { OmniPoint, createDefaultApplicative } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger, printCrossTable, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { ChainType, EndpointId, endpointIdToChainType, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-solana'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { getReceiveConfig, getSendConfig } from '@layerzerolabs/ua-devtools-evm-hardhat'

import { getSolanaReceiveConfig, getSolanaSendConfig } from './taskHelper'
import { createSolanaConnectionFactory } from './utils'

interface TaskArgs {
    logLevel?: string
    oappConfig: string
}

/**
 * Helper function to determine if the point is Solana
 * @param point {OmniPoint}
 */
const isSolana = (point: OmniPoint) => endpointIdToChainType(point.eid) === ChainType.SOLANA

/**
 * Helper function to get the hardhat.config.ts network name for a given endpoint id, or use the convention of
 * networkName-environment for Solana.
 * @param eid {EndpointId}
 */
const getEid = (eid: EndpointId) => {
    switch (eid) {
        // In the case of solana-testnet and solana-mainnet, we'll use the convention of networkName-environment
        case EndpointId.SOLANA_V2_TESTNET:
        case EndpointId.SOLANA_V2_MAINNET: {
            const { chainName, env } = getNetworkForChainId(eid)
            return `${chainName}-${env}`
        }
        default:
            // For all other chains, we'll use the network name from hardhat.config.ts
            return getNetworkNameForEid(eid)
    }
}

const action: ActionType<TaskArgs> = async ({ logLevel = 'info', oappConfig }, hre) => {
    setDefaultLogLevel(logLevel)
    const logger = createLogger(logLevel)

    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfig,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_CONFIG_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())
    const configs: Record<string, Record<string, unknown>> = {}

    // Iterate over the graph of connections not from Solana
    const tasks = graph.connections
        .filter(({ vector: { from } }) => !isSolana(from))
        .map(({ vector: { from, to } }) => async () => {
            const endpointV2Sdk = await (await evmSdkFactory(from)).getEndpointSDK()

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

            const localNetworkName = getEid(from.eid)
            const remoteNetworkName = getEid(to.eid)

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
    // Iterate over the graph of connections from Solana
    const solTasks = graph.connections
        .filter(({ vector: { from } }) => isSolana(from))
        .map(({ vector: { from, to } }) => async () => {
            const endpointV2Sdk = new EndpointV2(
                await createSolanaConnectionFactory()(from.eid),
                from,
                new PublicKey(from.address) // doesn't matter as we are not sending transactions
            )
            // OApp Config
            const receiveOAppConfig = await getSolanaReceiveConfig(endpointV2Sdk, to.eid, from.address)
            const sendOAppConfig = await getSolanaSendConfig(endpointV2Sdk, to.eid, from.address)
            const [sendOAppLibrary, sendOAppUlnConfig, sendOAppExecutorConfig] = sendOAppConfig ?? []
            const [receiveOAppLibrary, receiveOAppUlnConfig] = receiveOAppConfig ?? []

            const localNetworkName = getEid(from.eid)
            const remoteNetworkName = getEid(to.eid)

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
            // Defaults are treated much differently in Solana, so we only output the active OApp config.
            console.log(
                printCrossTable(
                    [
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
                    ['', 'Active OApp Config']
                )
            )
        })

    // We allow this script to be executed either in parallel or in series
    const applicative = createDefaultApplicative(logger)
    await applicative(tasks)
    await applicative(solTasks)

    return configs
}

task(
    TASK_LZ_OAPP_CONFIG_GET,
    'Outputs Custom OApp Config, Default OApp Config, and Active OApp Config. Each config contains Send & Receive Libraries, Send Uln & Executor Configs, and Receive Executor Configs',
    action
)
