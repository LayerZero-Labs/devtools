import { PublicKey } from '@solana/web3.js'
import { subtask, task } from 'hardhat/config'

import { createSignAndSendFlow, firstFactory } from '@layerzerolabs/devtools'
import {
    SUBTASK_LZ_SIGN_AND_SEND,
    createSignerFactory,
    types as devtoolsTypes,
} from '@layerzerolabs/devtools-evm-hardhat'
import { setTransactionSizeBuffer } from '@layerzerolabs/devtools-solana'
import { type LogLevel, createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId, endpointIdToVersion } from '@layerzerolabs/lz-definitions'
import { IOApp, OAppConfigurator, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
    SubtaskConfigureTaskArgs,
    TASK_LZ_OAPP_WIRE,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

import { getSolanaDeployment, useWeb3Js } from '../solana'

import { configureLzAppGraph } from './taskHelper'
import { publicKey } from './types'
import { createSdkFactory, createSolanaConnectionFactory, createSolanaSignerFactory } from './utils'

import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'

/**
 * Filters graph connections where `from.eid` is an EndpointV1.
 * @param graph The full OmniGraph to filter.
 * @returns Filtered graph with only EndpointV1 connections.
 */
const filterGraphForEndpointV1 = (graph: { connections: any[]; contracts: any[] }) => {
    // const filteredConnections = graph.connections.filter(
    //     ({ vector: { from } }) => endpointIdToVersion(from.eid) === 'v1'
    // )
    const filteredConnections = graph.connections.filter(({ vector: { from } }) => {
        return endpointIdToVersion(from.eid) === 'v1'
    })

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
    solanaEid: EndpointId
    multisigKey?: PublicKey
    oappConfig: string
    isSolanaInitConfig: boolean
    internalConfigurator?: OAppConfigurator
}

/**
 * Extend the default wiring task to add functionality for filtering EndpointV1 and EndpointV2.
 */
task(TASK_LZ_OAPP_WIRE)
    .addParam('solanaEid', 'Solana mainnet (30168) or testnet (40168)', undefined, devtoolsTypes.eid, true)
    .addParam('multisigKey', 'The MultiSig key', undefined, publicKey, true)
    // We use this argument to get around the fact that we want to both override the task action for the wiring task
    // and wrap this task with custom configurators
    //
    // By default, this argument will be left empty and the default OApp configurator will be used.
    // The tasks that are using custom configurators will override this argument with the configurator of their choice
    .addParam('internalConfigurator', 'FOR INTERNAL USE ONLY', undefined, devtoolsTypes.fn, true)
    .addParam('isSolanaInitConfig', 'FOR INTERNAL USE ONLY', undefined, devtoolsTypes.boolean, true)
    .setAction(async (args: Args, hre, runSuper) => {
        const logger = createLogger(args.logLevel)
        logger.info('Starting LayerZero OApp wiring task...')

        //
        //
        // ENVIRONMENT SETUP
        //
        //

        // The Solana transaction size estimation algorithm is not very accurate, so we increase its tolerance by 192 bytes
        setTransactionSizeBuffer(192)

        //
        //
        // USER INPUT
        //
        //

        // construct the user's keypair via SOLANA_PRIVATE_KEY or other supported methods
        const keypair = (await useWeb3Js()).web3JsKeypair
        const userAccount = keypair.publicKey

        const solanaDeployment = getSolanaDeployment(args.solanaEid)

        // Then we grab the programId from the args
        const programId = new PublicKey(solanaDeployment.programId)

        if (!programId) {
            logger.error('Missing programId in solana deployment')
            return
        }

        const configurator = args.internalConfigurator

        //
        //
        // TOOLING SETUP
        //
        //

        // We'll need a connection factory to be able to query the Solana network
        //
        // If you haven't set RPC_URL_SOLANA and/or RPC_URL_SOLANA_TESTNET environment variables,
        // the factory will use the default public RPC URLs
        const connectionFactory = createSolanaConnectionFactory()

        // We'll need SDKs to be able to use devtools
        const sdkFactory = createSdkFactory(userAccount, programId, connectionFactory)

        // We'll also need a signer factory
        const solanaSignerFactory = createSolanaSignerFactory(keypair, connectionFactory, args.multisigKey)

        //
        //
        // SUBTASK OVERRIDES
        //
        //

        // We'll need to override the default implementation of the configure subtask
        // (responsible for collecting the on-chain configuration of the contracts
        // and coming up with the transactions that need to be sent to the network)
        //
        // The only thing we are overriding is the sdkFactory parameter - we supply the SDK factory we created above
        subtask(
            SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
            'Configure OFT',
            (args: SubtaskConfigureTaskArgs<OAppOmniGraph, IOApp>, hre, runSuper) =>
                runSuper({
                    ...args,
                    configurator: configurator ?? args.configurator,
                    sdkFactory,
                })
        )
        // We'll also need to override the default implementation of the signAndSend subtask
        // (responsible for sending transactions to the network and waiting for confirmations)
        //
        // In this subtask we need to override the createSigner function so that it uses the Solana
        // signer for all Solana transactions
        subtask(SUBTASK_LZ_SIGN_AND_SEND, 'Sign OFT transactions', (args: SignAndSendTaskArgs, _hre, runSuper) =>
            runSuper({
                ...args,
                createSigner: firstFactory(solanaSignerFactory, args.createSigner),
            })
        )

        if (!args.isSolanaInitConfig) {
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
        }

        return runSuper(args)
    })
