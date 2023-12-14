import { task, types } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_WIRE_OAPP } from '@/constants/tasks'
import {
    isFile,
    isReadable,
    createLogger,
    setDefaultLogLevel,
    promptToContinue,
    printJson,
    pluralizeNoun,
    importDefault,
} from '@layerzerolabs/io-utils'
import { OAppOmniGraphHardhat, OAppOmniGraphHardhatSchema } from '@/oapp'
import { OAppOmniGraph, configureOApp } from '@layerzerolabs/ua-utils'
import { createOAppFactory } from '@layerzerolabs/ua-utils-evm'
import { OmniGraphBuilderHardhat, createConnectedContractFactory } from '@layerzerolabs/utils-evm-hardhat'
import { OmniTransaction } from '@layerzerolabs/utils'
import { printTransactions } from '@layerzerolabs/utils'
import { resolve } from 'path'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

const action: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }) => {
    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const logger = createLogger()

    // First we check that the config file is indeed there and we can read it
    logger.verbose(`Checking config file '${oappConfigPath}' for existence & readability`)
    const isConfigReadable = isFile(oappConfigPath) && isReadable(oappConfigPath)
    if (!isConfigReadable) {
        throw new Error(
            `Unable to read config file '${oappConfigPath}'. Check that the file exists and is readable to your terminal user`
        )
    }

    // Keep talking to the user
    logger.verbose(`Config file '${oappConfigPath}' exists & is readable`)

    // Now let's see if we can load the config file
    let rawConfig: unknown
    try {
        logger.verbose(`Loading config file '${oappConfigPath}'`)

        rawConfig = await importDefault(resolve(oappConfigPath))
    } catch (error) {
        throw new Error(`Unable to read config file '${oappConfigPath}': ${error}`)
    }

    logger.verbose(`Loaded config file '${oappConfigPath}'`)

    // It's time to make sure that the config is not malformed
    //
    // At this stage we are only interested in the shape of the data,
    // we are not checking whether the information makes sense (e.g.
    // whether there are no missing nodes etc)
    logger.verbose(`Validating the structure of config file '${oappConfigPath}'`)
    const configParseResult = OAppOmniGraphHardhatSchema.safeParse(rawConfig)
    if (configParseResult.success === false) {
        // FIXME Error formatting
        const errors = configParseResult.error.flatten(
            (issue) => `Property '${issue.path.join('.') ?? '[root]'}': ${issue.message}`
        )
        const formErrors = errors.formErrors.map((error) => `- ${error}`).join(`\n`)
        const fieldErrors = Object.entries(errors.fieldErrors).map(
            ([field, errors]) => `\n${field}:\n${errors.map((error) => `- ${error}`).join(`\n`)}`
        )
        const allErrors = [...formErrors, fieldErrors]

        throw new Error(
            `Config from file '${oappConfigPath}' is malformed. Please fix the following errors:\n\n${allErrors}`
        )
    }

    // At this point we have a correctly typed config in the hardhat format
    const hardhatGraph: OAppOmniGraphHardhat = configParseResult.data

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
    const previewTransactions = await promptToContinue(`Would you like to preview the transactions before continuing?`)
    if (previewTransactions) logger.info(`\n${printTransactions(transactions)}`)

    // Now ask the user whether they want to go ahead with signing them
    const go = await promptToContinue()
    if (!go) {
        return undefined
    }

    return []
}
task(TASK_LZ_WIRE_OAPP, 'Wire LayerZero OApp')
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.string)
    .setAction(action)
