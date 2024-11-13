import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import {
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SUBTASK_LZ_OAPP_READ_WIRE_CONFIGURE,
    SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
    TASK_LZ_OAPP_READ_WIRE,
} from '@/constants/tasks'
import { createLogger, setDefaultLogLevel, printJson, pluralizeNoun } from '@layerzerolabs/io-devtools'
import {
    types,
    SUBTASK_LZ_SIGN_AND_SEND,
    createGnosisSignerFactory,
    createSignerFactory,
    formatOmniTransaction,
} from '@layerzerolabs/devtools-evm-hardhat'
import { OmniTransaction } from '@layerzerolabs/devtools'
import { printLogo, printRecords } from '@layerzerolabs/io-devtools/swag'
import type { SignAndSendResult } from '@layerzerolabs/devtools'
import type { SignAndSendTaskArgs } from '@layerzerolabs/devtools-evm-hardhat/tasks'

import './read.subtask.configure'
import { OAppReadOmniGraphHardhatSchema } from '@/oapp-read'
import { SubtaskConfigureTaskArgs, SubtaskLoadConfigTaskArgs } from '@/tasks/oapp/types'
import type { SignerDefinition } from '@layerzerolabs/devtools-evm'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    ci?: boolean
    dryRun?: boolean
    assert?: boolean
    safe?: boolean
    signer?: SignerDefinition
    /**
     * Name of a custom config loading subtask
     *
     * This can be useful in situations where a single project
     * requires multiple custom configurations with their own config validation schemas
     */
    loadConfigSubtask?: string
    /**
     * Name of a custom configuration subtask
     *
     * This can be useful in situations where a single project
     * requires multiple custom configurations with their own configurators
     */
    configureSubtask?: string
    /**
     * Name of a custom sign & send subtask
     *
     * This can be useful in situations where a completely sifferent signing logic is required
     */
    signAndSendSubtask?: string
}

// TODO READ: This task is just copying and change some parameters from wire/index.ts, make them more generic
const action: ActionType<TaskArgs> = async (
    {
        oappConfig: oappConfigPath,
        logLevel = 'info',
        ci = false,
        dryRun = false,
        assert = false,
        safe = false,
        signer,
        loadConfigSubtask = SUBTASK_LZ_OAPP_CONFIG_LOAD,
        configureSubtask = SUBTASK_LZ_OAPP_WIRE_CONFIGURE,
        signAndSendSubtask = SUBTASK_LZ_SIGN_AND_SEND,
    },
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

    // Now we can load and validate the config
    const graph = await hre.run(loadConfigSubtask, {
        configPath: oappConfigPath,
        schema: OAppReadOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_READ_WIRE,
    } satisfies SubtaskLoadConfigTaskArgs)

    // At this point we are ready to create the list of transactions
    logger.verbose(`Creating a list of wiring transactions`)

    // If using the default configuration subtask and we are wiring an OAppRead,
    // we'll switch to the OAppRead configuration subtask
    configureSubtask = SUBTASK_LZ_OAPP_READ_WIRE_CONFIGURE
    // We'll get the list of OmniTransactions using a subtask to allow for developers
    // to use this as a hook and extend the configuration
    logger.debug(`Using ${configureSubtask} subtask to get the configuration`)
    const transactions: OmniTransaction[] = await hre.run(configureSubtask, {
        graph,
    } satisfies SubtaskConfigureTaskArgs)

    // Flood users with debug output
    logger.verbose(`Created a list of wiring transactions`)
    logger.debug(`Following transactions are necessary:\n\n${printJson(transactions)}`)

    // If there are no transactions that need to be executed, we'll just exit
    if (transactions.length === 0) {
        logger.info(`The OApp is wired, no action is necessary`)

        return [[], [], []]
    } else if (assert) {
        // If we are in assertion mode, we'll print out the transactions and exit with code 1
        // if there is anything left to configure
        logger.error(`The OApp is not fully wired, following transactions are necessary:`)

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
            `There is 1 transaction required to configure the OApp`,
            `There are ${transactions.length} transactions required to configure the OApp`
        )
    )

    // Now let's create the signer
    logger.debug(
        signer == null ? `Creating a default signer` : `Creating a signer based on definition: ${printJson(signer)}`
    )
    const createSigner = safe ? createGnosisSignerFactory(signer) : createSignerFactory(signer)

    // Now sign & send the transactions
    logger.debug(`Using ${signAndSendSubtask} subtask to sign & send the transactions`)
    const signAndSendResult: SignAndSendResult = await hre.run(signAndSendSubtask, {
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

task(TASK_LZ_OAPP_READ_WIRE, 'Wire LayerZero OApp', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam(
        'loadConfigSubtask',
        'Override the default config loading subtask',
        SUBTASK_LZ_OAPP_CONFIG_LOAD,
        types.string,
        true
    )
    .addParam(
        'configureSubtask',
        'Override the default configuration subtask',
        SUBTASK_LZ_OAPP_READ_WIRE_CONFIGURE,
        types.string,
        true
    )
    .addParam(
        'signAndSendSubtask',
        'Override the default sign & send subtask',
        SUBTASK_LZ_SIGN_AND_SEND,
        types.string,
        true
    )
    .addFlag('ci', 'Continuous integration (non-interactive) mode. Will not ask for any input from the user')
    .addFlag('dryRun', 'Will not execute any transactions')
    .addFlag(
        'assert',
        'Will not execute any transactions and fail if there are any transactions required to configure the OApp'
    )
    .addFlag('safe', 'Use gnosis safe to sign transactions')
    .addParam('signer', 'Index or address of signer', undefined, types.signer, true)
