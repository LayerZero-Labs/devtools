import { task, types } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_WIRE_OAPP } from '@/constants/tasks'
import {
    createLogger,
    setDefaultLogLevel,
    promptToContinue,
    printJson,
    pluralizeNoun,
    printBoolean,
} from '@layerzerolabs/io-devtools'
import { OAppOmniGraph, configureOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    createConnectedContractFactory,
    createSignerFactory,
    formatOmniTransaction,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createSignAndSend, OmniTransaction } from '@layerzerolabs/devtools'
import { createProgressBar, printLogo, printRecords, render } from '@layerzerolabs/io-devtools/swag'
import { validateAndTransformOappConfig } from '@/utils/taskHelpers'

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
    const graph: OAppOmniGraph = await validateAndTransformOappConfig(oappConfigPath, logger)

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
    if (previewTransactions) printRecords(transactions.map(formatOmniTransaction))

    // Now ask the user whether they want to go ahead with signing them
    const shouldSubmit = isInteractive
        ? await promptToContinue(`Would you like to submit the required transactions?`)
        : true
    if (!shouldSubmit) return logger.verbose(`User cancelled the operation, exiting`), undefined

    // The last step is to execute those transactions
    //
    // For now we are only allowing sign & send using the accounts confgiured in hardhat config
    const signAndSend = createSignAndSend(createSignerFactory())

    // eslint-disable-next-line no-constant-condition
    while (true) {
        // Now we render a progressbar to monitor the task progress
        const progressBar = render(createProgressBar({ before: 'Signing... ', after: ` 0/${transactions.length}` }))

        logger.verbose(`Sending the transactions`)
        const [successful, errors] = await signAndSend(transactions, (result, results) => {
            // We'll keep updating the progressbar as we sign the transactions
            progressBar.rerender(
                createProgressBar({
                    progress: results.length / transactions.length,
                    before: 'Signing... ',
                    after: ` ${results.length}/${transactions.length}`,
                })
            )
        })

        // And finally we drop the progressbar and continue
        progressBar.clear()

        logger.verbose(`Sent the transactions`)
        logger.debug(`Successfully sent the following transactions:\n\n${printJson(successful)}`)
        logger.debug(`Failed to send the following transactions:\n\n${printJson(errors)}`)

        logger.info(
            pluralizeNoun(
                transactions.length,
                `Successfully sent 1 transaction`,
                `Successfully sent ${successful.length} transactions`
            )
        )

        // If there are no errors, we break out of the loop immediatelly
        if (errors.length === 0) {
            logger.info(`${printBoolean(true)} Your OApp is now configured`)

            return [successful, errors]
        }

        // Now we bring the bad news to the user
        logger.error(
            pluralizeNoun(
                transactions.length,
                `Failed to send 1 transaction`,
                `Failed to send ${errors.length} transactions`
            )
        )

        // FIXME Show errors along with the transactions
        const previewErrors = isInteractive
            ? await promptToContinue(`Would you like to preview the failed transactions?`)
            : true
        if (previewErrors) printRecords(transactions.map(formatOmniTransaction))

        // We'll ask the user if they want to retry if we're in interactive mode
        //
        // If they decide not to, we exit, if they want to retry we start the loop again
        const retry = isInteractive ? await promptToContinue(`Would you like to retry?`, true) : false
        if (!retry) {
            logger.error(`${printBoolean(false)} Failed to configure the OApp`)

            return [successful, errors]
        }
    }
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
