import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP } from '@/constants/tasks'
import { createLogger, setDefaultLogLevel, printJson, pluralizeNoun } from '@layerzerolabs/io-devtools'
import { OwnableOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    types,
    SUBTASK_LZ_SIGN_AND_SEND,
    createConnectedContractFactory,
    createSignerFactory,
    createGnosisSignerFactory,
    formatOmniTransaction,
} from '@layerzerolabs/devtools-evm-hardhat'
import { printLogo, printRecords } from '@layerzerolabs/io-devtools/swag'
import { type SignAndSendResult } from '@layerzerolabs/devtools'
import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'
import { OwnableOmniGraphHardhatSchema } from '@/ownable'
import { configureOwnable } from '@layerzerolabs/ua-devtools'
import { createOAppFactory, createOwnableFactory } from '@layerzerolabs/ua-devtools-evm'
import type { SubtaskLoadConfigTaskArgs } from '@/tasks/oapp/types'
import type { SignerDefinition } from '@layerzerolabs/devtools-evm'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    ci?: boolean
    dryRun?: boolean
    assert?: boolean
    safe?: boolean
    signer?: SignerDefinition
}

const action: ActionType<TaskArgs> = async (
    { oappConfig: oappConfigPath, logLevel = 'info', ci = false, dryRun = false, assert = false, safe = false, signer },
    hre
): Promise<SignAndSendResult> => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    if (assert) {
        logger.info(`Running in assertion mode`)
    } else if (dryRun) {
        logger.info(`Running in dry run mode`)
    }

    // Now we load the graph
    const graph: OwnableOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfigPath,
        schema: OwnableOmniGraphHardhatSchema,
        task: TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP,
    } satisfies SubtaskLoadConfigTaskArgs)

    // At this point we are ready to create the list of transactions
    logger.verbose(`Creating a list of ownership transferring transactions`)

    const createSdk = createOwnableFactory(createOAppFactory(createConnectedContractFactory()))
    const transactions = await configureOwnable(graph, createSdk)

    // Flood users with debug output
    logger.verbose(`Created a list of ownership transferring transactions`)
    logger.debug(`Following transactions are necessary:\n\n${printJson(transactions)}`)

    // If there are no transactions that need to be executed, we'll just exit
    if (transactions.length === 0) {
        logger.info(`The ownership is correct, no action is necessary`)

        return [[], [], []]
    } else if (assert) {
        // If we are in assertion mode, we'll print out the transactions and exit with code 1
        // if there is anything left to configure
        logger.error(`The ownership is not fully transferred, following transactions are necessary:`)

        // Print the outstanding transactions
        printRecords(transactions.map(formatOmniTransaction))

        // And set the exit code to failure
        process.exitCode = process.exitCode || 1

        return [[], [], transactions]
    }

    // If we are in dry run mode, we'll just print the transactions and exit
    if (dryRun) {
        printRecords(transactions.map(formatOmniTransaction))

        return [[], [], transactions]
    }

    // Tell the user about the transactions
    logger.info(
        pluralizeNoun(
            transactions.length,
            `There is 1 transaction required to transfer the ownership`,
            `There are ${transactions.length} transactions required to transfer the ownership`
        )
    )

    // Now let's create the signer
    const createSigner = safe ? createGnosisSignerFactory(signer) : createSignerFactory(signer)

    // And sign & send the transactions
    const signAndSendResult: SignAndSendResult = await hre.run(SUBTASK_LZ_SIGN_AND_SEND, {
        transactions,
        ci,
        createSigner,
    } satisfies SignAndSendTaskArgs)

    // Mark the process as unsuccessful if there were any errors (only if it has not yet been marked as such)
    const [, failed] = signAndSendResult
    if (failed.length !== 0) {
        process.exitCode = process.exitCode || 1
    }

    return signAndSendResult
}

task(TASK_LZ_OWNABLE_TRANSFER_OWNERSHIP, 'Transfer ownable contract ownership', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
    .addFlag('safe', 'Use gnosis safe to sign transactions')
    .addFlag('dryRun', 'Will not execute any transactions')
    .addFlag(
        'assert',
        'Will not execute any transactions and fail if there are any transactions required to transfer the ownership'
    )
    .addParam('signer', 'Index or address of signer', undefined, types.signer, true)
