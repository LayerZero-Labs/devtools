import { task, types } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_WIRE_OAPP } from '@/constants/tasks'
import {
    createLogger,
    createConfigLoader,
    setDefaultLogLevel,
    promptToContinue,
    printJson,
    pluralizeNoun,
    printBoolean,
} from '@layerzerolabs/io-devtools'
import { OAppOmniGraphHardhat, OAppOmniGraphHardhatSchema } from '@/oapp'
import { OAppOmniGraph, configureOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    OmniGraphBuilderHardhat,
    createConnectedContractFactory,
    createSignerFactory,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createSignAndSend, OmniTransaction } from '@layerzerolabs/devtools'
import { printTransactions } from '@layerzerolabs/devtools'
import { resolve } from 'path'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import {validateAndTransformOappConfig} from "@/utils/taskHelpers";

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    ci?: boolean
}

const action: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info', ci = false }) => {
    printLogo()

    // We only want to be asking users for input if we are not in interactive mode
    const isInteractive = !ci

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()
    let graph: OAppOmniGraph = await validateAndTransformOappConfig(oappConfigPath, logger)

    // At this point we are ready to create the list of transactions
    logger.verbose(`Creating a list of wiring transactions`)
    const contractFactory = createConnectedContractFactory()
    const oAppFactory = createOAppFactory(contractFactory)

    let transactions: OmniTransaction[]
    try {
        transactions = await configureOApp(graph, oAppFactory)
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }

    // Flood users with debug output
    logger.verbose(`Created a list of wiring transactions`)
    logger.debug(`Following transactions are necessary:\n\n${printJson(transactions)}`)

    // If there are no transactions that need to be executed, we'll just exit
    if (transactions.length === 0) {
        logger.info(`The OApp is wired, no action is necessary`)

        return []
    }

    // Tell the user about the transactions
    logger.info(
        pluralizeNoun(
            transactions.length,
            `There is 1 transaction required to configure the OApp`,
            `There are ${transactions.length} transactions required to configure the OApp`
        )
    )

    // Ask them whether they want to see them
    const previewTransactions = isInteractive
        ? await promptToContinue(`Would you like to preview the transactions before continuing?`)
        : true
    if (previewTransactions) logger.info(`\n${printTransactions(transactions)}`)

    // Now ask the user whether they want to go ahead with signing them
    const shouldSubmit = isInteractive
        ? await promptToContinue(`Would you like to submit the required transactions?`)
        : true
    if (!shouldSubmit) return logger.verbose(`User cancelled the operation, exiting`), undefined

    // The last step is to execute those transactions
    //
    // For now we are only allowing sign & send using the accounts confgiured in hardhat config
    const signAndSend = createSignAndSend(createSignerFactory())

    logger.verbose(`Sending the transactions`)
    const results = await signAndSend(transactions)

    logger.verbose(`Sent the transactions`)
    logger.debug(`Received the following output:\n\n${printJson(results)}`)

    // FIXME We need to check whether we got any errors and display those to the user
    logger.info(
        pluralizeNoun(
            transactions.length,
            `Successfully sent 1 transaction`,
            `Successfully sent ${transactions.length} transactions`
        )
    )
    logger.info(`${printBoolean(true)} Your OApp is now configured`)

    // FIXME We need to return the results
    return []
}
task(TASK_LZ_WIRE_OAPP, 'Wire LayerZero OApp')
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.string)
    .addParam(
        'ci',
        'Continuous integration (non-interactive) mode. Will not ask for any input from the user',
        false,
        types.boolean
    )
    .setAction(action)
