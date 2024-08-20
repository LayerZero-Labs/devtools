import type { Configurator, OmniGraph, OmniSDKFactory } from '@/omnigraph/types'
import { formatOmniTransaction, OmniTransaction, SignAndSend } from '@/transactions'
import { createLogger, printBoolean, printJson, type Logger } from '@layerzerolabs/io-devtools'
import { printRecords } from '@layerzerolabs/io-devtools/swag'

export interface WireFlowOptions {
    assert?: boolean
    dryRun?: boolean
    logger?: Logger
    configPath: string
    loadConfig: (path: string) => Promise<OmniGraph>
    configure: Configurator
    signAndSend: SignAndSend
    createSdk: OmniSDKFactory
}

export const wireFlow = async ({
    assert,
    dryRun,
    logger = createLogger(),
    configPath,
    loadConfig,
    configure,
    createSdk,
}: WireFlowOptions) => {
    // And since this command is not complete yet, we'll warn the user
    logger.warn(
        `This command is just a placeholder. Please use @layerzerolabs/toolbox-hardhat package for the time being.`
    )

    if (assert) {
        logger.info(`Running in assertion mode`)
    } else if (dryRun) {
        logger.info(`Running in dry run mode`)
    }

    let graph: OmniGraph

    // Now it's time to load the config file
    try {
        logger.info(`Loading config file from ${configPath}`)

        graph = await loadConfig(configPath)

        logger.info(`${printBoolean(true)} Successfully loaded config file from ${configPath}`)
        logger.debug(`Loaded config file from ${configPath}:\n\n${printJson(graph)}`)
    } catch (error) {
        logger.error(`Failed to load config from ${configPath}:\n\n${error}`)

        process.exit(1)
    }

    let transactions: OmniTransaction[]

    try {
        logger.info(`Checking configuration`)

        transactions = await configure(graph, createSdk)
    } catch (error) {
        logger.error(`Failed to check OApp configuration:\n\n${error}`)

        process.exit(1)
    }

    // If there are no transactions that need to be executed, we'll just exit
    if (transactions.length === 0) {
        return logger.info(`The OApp is wired, no action is necessary`), undefined
    } else if (assert) {
        // If we are in assertion mode, we'll print out the transactions and exit with code 1
        // if there is anything left to configure
        logger.error(`The OApp is not fully wired, following transactions are necessary:`)

        // Print the outstanding transactions
        printRecords(transactions.map(formatOmniTransaction))

        // Exit with non-zero error code
        process.exit(1)
    }

    // If we are in dry run mode, we'll just print the transactions and exit
    if (dryRun) {
        printRecords(transactions.map(formatOmniTransaction))
    }
}
