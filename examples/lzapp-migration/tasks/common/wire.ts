import { Keypair, PublicKey } from '@solana/web3.js'
import { subtask, task } from 'hardhat/config'

import { createSignAndSendFlow, firstFactory } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, createSignerFactory, inheritTask } from '@layerzerolabs/devtools-evm-hardhat'
import { type LogLevel, createLogger } from '@layerzerolabs/io-devtools'
import { endpointIdToVersion } from '@layerzerolabs/lz-definitions'
import { createLzAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { SUBTASK_LZ_OAPP_WIRE_CONFIGURE, TASK_LZ_OAPP_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { initOFTAccounts } from '@layerzerolabs/ua-devtools-solana'

import { configureLzAppGraph } from './taskHelper'
import { keyPair, publicKey } from './types'

/**
 * Filters graph connections where `from.eid` is an EndpointV1.
 * @param graph The full OmniGraph to filter.
 * @returns Filtered graph with only EndpointV1 connections.
 */
const filterGraphForEndpointV1 = (graph: { connections: any[]; contracts: any[] }) => {
    const filteredConnections = graph.connections.filter(
        ({ vector: { from } }) => endpointIdToVersion(from.eid) === 'v1'
    )

    return {
        ...graph,
        connections: filteredConnections,
    }
}

/**
 * Filters graph connections where `from.eid` is an EndpointV2.
 * @param graph The full OmniGraph to filter.
 * @returns Filtered graph with only EndpointV2 connections.
 */
const filterGraphForEndpointV2 = (graph: { connections: any[]; contracts: any[] }) => {
    const filteredConnections = graph.connections.filter(
        ({ vector: { from } }) => endpointIdToVersion(from.eid) === 'v2'
    )

    return {
        ...graph,
        connections: filteredConnections,
    }
}

/**
 * Additional CLI arguments for our custom wire task
 */
interface Args {
    logLevel: LogLevel
    solanaProgramId: PublicKey
    solanaSecretKey?: Keypair
    oappConfig: string
}

/**
 * Extend the default wiring task to add functionality for filtering EndpointV1 and EndpointV2.
 */
task(TASK_LZ_OAPP_WIRE)
    .addParam(
        'solanaSecretKey',
        'Secret key of the user account that will be used to send transactions',
        undefined,
        keyPair,
        true
    )
    .addParam('solanaProgramId', 'The OFT program ID to use', undefined, publicKey, true)
    .setAction(async (args: Args, hre, runSuper) => {
        const logger = createLogger(args.logLevel)
        logger.info('Starting LayerZero OApp wiring task...')

        const evmContractFactory = createConnectedContractFactory()
        const lzAppFactory = createLzAppFactory(evmContractFactory)

        // Merge EVM and Solana factories into a single SDK factory
        const sdkFactory = firstFactory(lzAppFactory)

        // Create a default signer factory
        const createSigner = createSignerFactory()
        // Override the configure subtask to include the filtered graph
        subtask(SUBTASK_LZ_OAPP_WIRE_CONFIGURE, 'Configure OApp connections').setAction(
            async (subtaskArgs, hre, runSuper) => {
                const { graph } = subtaskArgs

                // Filter the graph for EndpointV1 connections
                const v1Graph = filterGraphForEndpointV1(graph)

                logger.info(`[EndpointV1] Checking connections`)

                // Use the custom `configureLzAppTrustedRemotes` logic for the V1 graph
                const setConfigurationTxs = await configureLzAppGraph(v1Graph, hre)

                const transactions = [...setConfigurationTxs]

                if (transactions.length > 0) {
                    logger.info(`Generated ${transactions.length} transactions for OApp configuration.`)
                    await createSignAndSendFlow({ createSigner })({ transactions })
                }

                if (transactions.length === 0) {
                    logger.info('The LzApp is wired, no action is necessary')
                }

                // Filter the graph for EndpointV2 connections
                const v2Graph = filterGraphForEndpointV2(graph)

                logger.info(`[EndpointV2] checking connections`)

                // Pass the filtered V2 graph to the original task logic
                return runSuper({
                    ...subtaskArgs,
                    graph: v2Graph,
                })
            }
        )
        return runSuper(args)
    })

// We'll create clones of the wire task and only override the configurator argument
const wireLikeTask = inheritTask(TASK_LZ_OAPP_WIRE)

// This task will use the `initOFTAccounts` configurator that initializes the Solana accounts
wireLikeTask('lz:oapp:init:solana')
    .setDescription('Initialize OFT accounts for Solana')
    .setAction(async (args: Args, hre) =>
        hre.run(TASK_LZ_OAPP_WIRE, { ...args, internalConfigurator: initOFTAccounts })
    )
