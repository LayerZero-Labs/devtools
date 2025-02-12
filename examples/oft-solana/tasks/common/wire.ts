import { Keypair, PublicKey } from '@solana/web3.js'
import { subtask, task } from 'hardhat/config'

import { firstFactory } from '@layerzerolabs/devtools'
import { SUBTASK_LZ_SIGN_AND_SEND, types } from '@layerzerolabs/devtools-evm-hardhat'
import { setTransactionSizeBuffer } from '@layerzerolabs/devtools-solana'
import { type LogLevel, createLogger } from '@layerzerolabs/io-devtools'
import { type IOApp, type OAppConfigurator, type OAppOmniGraph, configureOwnable } from '@layerzerolabs/ua-devtools'
import {
    SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
    type SubtaskConfigureTaskArgs,
    TASK_LZ_OAPP_WIRE,
    TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

import { keyPair, publicKey } from './types'
import { createSdkFactory, createSolanaConnectionFactory, createSolanaSignerFactory } from './utils'

import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'

/**
 * Additional CLI arguments for our custom wire task
 */
interface Args {
    logLevel: LogLevel
    solanaProgramId: PublicKey
    solanaSecretKey?: Keypair
    multisigKey?: PublicKey
    internalConfigurator?: OAppConfigurator
}

/**
 * We extend the default wiring task to add functionality required by Solana
 */
task(TASK_LZ_OAPP_WIRE)
    // The first thing we add is the solana secret key, used to create a signer
    //
    // This secret key will also be used as the user account, required to use the OFT SDK
    .addParam(
        'solanaSecretKey',
        'Secret key of the user account that will be used to send transactions',
        undefined,
        keyPair,
        true
    )
    .addParam('solanaProgramId', 'The OFT program ID to use', undefined, publicKey, true)
    .addParam('multisigKey', 'The MultiSig key', undefined, publicKey, true)
    // We use this argument to get around the fact that we want to both override the task action for the wiring task
    // and wrap this task with custom configurators
    //
    // By default, this argument will be left empty and the default OApp configurator will be used.
    // The tasks that are using custom configurators will override this argument with the configurator of their choice
    .addParam('internalConfigurator', 'FOR INTERNAL USE ONLY', undefined, types.fn, true)
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

        if (args.solanaSecretKey == null) {
            logger.warn(
                `Missing --solana-secret-key CLI argument. A random keypair will be generated and interaction with solana programs will not be possible`
            )
        }

        // The first step is to create the user Keypair from the secret passed in
        const wallet = args.solanaSecretKey ?? Keypair.generate()
        const userAccount = wallet.publicKey

        // Then we grab the programId from the args
        const programId = args.solanaProgramId

        if (!programId) {
            logger.error('Missing --solana-program-id CLI argument')
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
        const solanaSignerFactory = createSolanaSignerFactory(wallet, connectionFactory, args.multisigKey)

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
    // The first thing we add is the solana secret key, used to create a signer
    //
    // This secret key will also be used as the user account, required to use the OFT SDK
    .addParam(
        'solanaSecretKey',
        'Secret key of the user account that will be used to send transactions',
        undefined,
        keyPair,
        true
    )
    // The next (optional) parameter is the OFT program ID
    //
    // Only pass this if you deployed a new OFT program, if you are using the default
    // LayerZero OFT program you can omit this
    .addParam('solanaProgramId', 'The OFT program ID to use', undefined, publicKey, true)
    .addParam('multisigKey', 'The MultiSig key', undefined, publicKey, true)
    .setAction(async (args: Args, hre) => {
        return hre.run(TASK_LZ_OAPP_WIRE, { ...args, internalConfigurator: configureOwnable })
    })
