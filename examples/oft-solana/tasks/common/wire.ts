import { PublicKey } from '@solana/web3.js'
import { subtask, task } from 'hardhat/config'

import { firstFactory } from '@layerzerolabs/devtools'
import { SUBTASK_LZ_SIGN_AND_SEND, types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { setTransactionSizeBuffer } from '@layerzerolabs/devtools-solana'
import { type LogLevel, createLogger } from '@layerzerolabs/io-devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { type IOApp, type OAppConfigurator, type OAppOmniGraph, configureOwnable } from '@layerzerolabs/ua-devtools'
import {
    SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
    type SubtaskConfigureTaskArgs,
    TASK_LZ_OAPP_WIRE,
    TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

import { getSolanaDeployment, useWeb3Js } from '../solana'
import { DebugLogger, KnownErrors } from '../solana/debug'

import { publicKey as publicKeyType } from './types'
import {
    createSdkFactory,
    createSolanaConnectionFactory,
    createSolanaSignerFactory,
    getSolanaUlnConfigPDAs,
} from './utils'

import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'

/**
 * Additional CLI arguments for our custom wire task
 */
interface Args {
    logLevel: LogLevel
    solanaEid: EndpointId
    multisigKey?: PublicKey
    isSolanaInitConfig: boolean // For internal use only. This helps us to control which code runs depdending on whether the task ran is wire or init-config
    internalConfigurator?: OAppConfigurator
}

/**
 * We extend the default wiring task to add functionality required by Solana
 */
task(TASK_LZ_OAPP_WIRE)
    .addParam('solanaEid', 'Solana mainnet (30168) or testnet (40168)', undefined, devtoolsTypes.eid, true)
    .addParam('multisigKey', 'The MultiSig key', undefined, publicKeyType, true)
    // We use this argument to get around the fact that we want to both override the task action for the wiring task
    // and wrap this task with custom configurators
    //
    // By default, this argument will be left empty and the default OApp configurator will be used.
    // The tasks that are using custom configurators will override this argument with the configurator of their choice
    .addParam('internalConfigurator', 'FOR INTERNAL USE ONLY', undefined, devtoolsTypes.fn, true)
    .addParam('isSolanaInitConfig', 'FOR INTERNAL USE ONLY', undefined, devtoolsTypes.boolean, true)
    .setAction(async (args: Args, hre, runSuper) => {
        const logger = createLogger(args.logLevel)

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

        // construct the user's keypair via the SOLANA_PRIVATE_KEY env var
        const keypair = useWeb3Js().web3JsKeypair
        const userAccount = keypair.publicKey

        const solanaDeployment = getSolanaDeployment(args.solanaEid)

        // Then we grab the programId from the args
        const programId = new PublicKey(solanaDeployment.programId)

        // TODO: refactor to instead use a function such as verifySolanaDeployment that also checks for oftStore key
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
            async (subtaskArgs: SubtaskConfigureTaskArgs<OAppOmniGraph, IOApp>, _hre, runSuper) => {
                // start of pre-wiring checks. we only do this when the current task is wire. if the current task is init-config, we shouldn't run this.
                if (!args.isSolanaInitConfig) {
                    logger.debug('Running pre-wiring checks...')
                    const { graph } = subtaskArgs
                    for (const connection of graph.connections) {
                        // check if from Solana Endpoint
                        if (endpointIdToChainType(connection.vector.from.eid) === ChainType.SOLANA) {
                            if (connection.config?.sendLibrary) {
                                // if from Solana Endpoint, ensure the PeerConfig account was already initialized
                                const solanaConnection = await connectionFactory(connection.vector.from.eid)

                                const [sendConfig, receiveConfig] = await getSolanaUlnConfigPDAs(
                                    connection.vector.to.eid,
                                    solanaConnection,
                                    new PublicKey(connection.config.sendLibrary),
                                    new PublicKey(solanaDeployment.oftStore)
                                )

                                if (sendConfig == null) {
                                    DebugLogger.printErrorAndFixSuggestion(
                                        KnownErrors.ULN_INIT_CONFIG_SKIPPED,
                                        `SendConfig on ${connection.vector.from.eid} not initialized for remote ${connection.vector.to.eid}.`
                                    )
                                }

                                if (receiveConfig == null) {
                                    DebugLogger.printErrorAndFixSuggestion(
                                        KnownErrors.ULN_INIT_CONFIG_SKIPPED,
                                        `ReceiveConfig on ${connection.vector.from.eid} not initialized for remote ${connection.vector.to.eid}.`
                                    )
                                }

                                if (sendConfig == null || receiveConfig == null) {
                                    throw new Error('SendConfig or ReceiveConfig not initialized. ')
                                }
                            } else {
                                logger.debug(
                                    `No sendLibrary found in connection config for ${connection.vector.from.eid} -> ${connection.vector.to.eid}`
                                )
                            }
                        }
                    }
                    // end of pre-wiring checks
                }

                return runSuper({
                    ...subtaskArgs,
                    configurator: configurator ?? subtaskArgs.configurator,
                    sdkFactory,
                })
            }
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

        return runSuper(args)
    })

// We'll change the default ownership transfer task to use our wire implementation
//
// The reason for this is the fact that the ownership transfer task has a deficiency
// and that is the fact that it does not support a custom SDK factory as of yet
//
// The two tasks are identical and the only drawback of this approach is the fact
// that the logs will say "Wiring OApp" instead of "Transferring ownership"
task(TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP)
    .addParam('solanaEid', 'Solana mainnet (30168) or testnet (40168)', undefined, devtoolsTypes.eid, true)
    .addParam('multisigKey', 'The MultiSig key', undefined, publicKeyType, true)
    .setAction(async (args: Args, hre) => {
        return hre.run(TASK_LZ_OAPP_WIRE, { ...args, internalConfigurator: configureOwnable })
    })
