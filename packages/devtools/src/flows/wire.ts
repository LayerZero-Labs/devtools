import { createLogger, printJson, pluralizeNoun, type Logger } from '@layerzerolabs/io-devtools'

import type { ConfigExecuteFlow } from './config.execute'
import type { SignAndSendFlow } from './sign.and.send'
import type { OmniGraph } from '@/omnigraph'
import { formatOmniTransaction, type OmniTransaction } from '@/transactions'
import { printRecords } from '@layerzerolabs/io-devtools/swag'
import { SignAndSendResult } from '@/transactions/signerTypes'

export interface CreateWireFlowArgs<TOmniGraph extends OmniGraph> {
    logger?: Logger
    executeConfig: ConfigExecuteFlow<TOmniGraph>
    signAndSend: SignAndSendFlow
}

export interface WireFlowArgs<TOmniGraph extends OmniGraph> {
    graph: TOmniGraph
    assert?: boolean
    dryRun?: boolean
    skipConnectionsFromEids?: string[]
}

export const createWireFlow =
    <TOmniGraph extends OmniGraph>({
        logger = createLogger(),
        executeConfig,
        signAndSend,
    }: CreateWireFlowArgs<TOmniGraph>) =>
    async ({
        graph,
        assert = false,
        dryRun = false,
        skipConnectionsFromEids = [],
    }: WireFlowArgs<TOmniGraph>): Promise<SignAndSendResult> => {
        if (assert) {
            logger.info(`Running in assertion mode`)
        } else if (dryRun) {
            logger.info(`Running in dry run mode`)
        }

        // At this point we are ready to create the list of transactions
        logger.verbose(`Creating a list of wiring transactions`)

        if (skipConnectionsFromEids.length > 0) {
            const excluded = skipConnectionsFromEids.map((eid) => parseInt(eid))
            graph.connections = graph.connections.filter((connection) => !excluded.includes(connection.vector.from.eid))
        }

        // We'll get the list of OmniTransactions using the config execution flow
        const transactions: OmniTransaction[] = await executeConfig({ graph })

        // Flood users with debug output
        logger.verbose(`Created a list of wiring transactions`)
        logger.debug(`Following transactions are necessary:\n\n${printJson(transactions)}`)

        // If there are no transactions that need to be executed, we'll just exit
        if (transactions.length === 0) {
            logger.info(`The OApp is wired, no action is necessary`)

            return [[], [], []]
        }

        // If we are in a dry run mode, we print our the results and exit
        if (dryRun) {
            printRecords(transactions.map(formatOmniTransaction))

            return [[], [], transactions]
        }

        // If we are in an assertion mode, we make sure there are no pending transactions
        if (assert) {
            // Let the user know something's about to go down
            logger.error(`The OApp is not fully wired, following transactions are necessary:`)

            // Print the outstanding transactions
            printRecords(transactions.map(formatOmniTransaction))

            // Mark the process as failed (if not already marked)
            //
            // TODO This is a bit ugly since we might not be running this in a standalone process
            // so we might want to move the assert functionality outside of this flow
            process.exitCode = process.exitCode || 1

            // Return the list of pending transactions
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

        // Now sign & send the transactions
        const signAndSendResult: SignAndSendResult = await signAndSend({
            transactions,
        })

        return signAndSendResult
    }
