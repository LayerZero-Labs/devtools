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
} from '@layerzerolabs/io-utils'
import { OAppOmniGraphHardhat, OAppOmniGraphHardhatSchema } from '@/oapp'
import { OAppOmniGraph, configureOApp } from '@layerzerolabs/ua-utils'
import { createOAppFactory } from '@layerzerolabs/ua-utils-evm'
import {
    OmniGraphBuilderHardhat,
    createConnectedContractFactory,
    createSignerFactory,
} from '@layerzerolabs/utils-evm-hardhat'
import { createSignAndSend, OmniTransaction } from '@layerzerolabs/utils'
import { printTransactions } from '@layerzerolabs/utils'
import { resolve } from 'path'
import { printLogo } from '@layerzerolabs/io-utils/swag'

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

    // Now we create our config loader
    const configLoader = createConfigLoader<OAppOmniGraphHardhat>(OAppOmniGraphHardhatSchema)

    // At this point we have a correctly typed config in the hardhat format
    const hardhatGraph: OAppOmniGraphHardhat = await configLoader(resolve(oappConfigPath))

    // We'll also print out the whole config for verbose loggers
    logger.verbose(`Config file '${oappConfigPath}' has correct structure`)
    logger.debug(`The hardhat config is:\n\n${printJson(hardhatGraph)}`)

    // What we need to do now is transform the config from hardhat format to the generic format
    // with addresses instead of contractNames
    logger.verbose(`Transforming '${oappConfigPath}' from hardhat-specific format to generic format`)
    let graph: OAppOmniGraph
    try {
        // The transformation is achieved using a builder that also validates the resulting graph
        // (i.e. makes sure that all the contracts exist and connections are valid)
        const builder = await OmniGraphBuilderHardhat.fromConfig(hardhatGraph)

        // We only need the graph so we throw away the builder
        graph = builder.graph
    } catch (error) {
        throw new Error(`Config from file '${oappConfigPath}' is invalid: ${error}`)
    }

    // Show more detailed logs to interested users
    logger.verbose(`Transformed '${oappConfigPath}' from hardhat-specific format to generic format`)
    logger.debug(`The resulting config is:\n\n${printJson(graph)}`)

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
