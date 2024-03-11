import { createModuleLogger, pluralizeNoun, pluralizeOrdinal } from '@layerzerolabs/io-devtools'
import type { OmniSignerFactory, OmniTransaction, OmniTransactionWithError, OmniTransactionWithReceipt } from './types'
import { formatEid, formatOmniPoint } from '@/omnigraph/format'
import { groupTransactionsByEid } from './utils'

export type SignAndSendResult = [
    // All the successful transactions
    successful: OmniTransactionWithReceipt[],
    // The failed transactions along with the errors
    errors: OmniTransactionWithError[],
    // All the transactions that have not been executed (including the failed ones)
    pending: OmniTransaction[],
]

/**
 * Creates a sign & send utility for a list of transaction
 * with a help of `OmniSignerFactory`
 *
 * @param {OmniSignerFactory} createSigner
 */
export const createSignAndSend =
    (createSigner: OmniSignerFactory) =>
    async (
        transactions: OmniTransaction[],
        onProgress?: (result: OmniTransactionWithReceipt, results: OmniTransactionWithReceipt[]) => unknown
    ): Promise<SignAndSendResult> => {
        const logger = createModuleLogger('sign & send')

        // Put it here so that we don't need to type like seven toilet rolls of variable names
        const n = transactions.length

        // Just exit when there is nothing to sign
        if (n === 0) {
            return logger.debug(`No transactions to sign, exiting`), [[], [], []]
        }

        // Tell the user how many we are signing
        logger.debug(`Signing ${n} ${pluralizeNoun(n, 'transaction')}`)

        const transactionGroups = Array.from(groupTransactionsByEid(transactions).entries())

        // We'll gather the state of the signing here
        const successful: OmniTransactionWithReceipt[] = []
        const errors: OmniTransactionWithError[] = []

        await Promise.allSettled(
            transactionGroups.map(async ([eid, eidTransactions]): Promise<void> => {
                const eidName = formatEid(eid)

                logger.debug(
                    `Signing ${eidTransactions.length} ${pluralizeNoun(eidTransactions.length, 'transaction')} for ${eidName}`
                )

                logger.debug(`Creating signer for ${eidName}`)
                const signer = await createSigner(eid)

                for (const [index, transaction] of eidTransactions.entries()) {
                    // We want to refer to this transaction by index so we create an ordinal for it (1st, 2nd etc)
                    const ordinal = pluralizeOrdinal(index + 1)

                    try {
                        logger.debug(
                            `Signing ${ordinal} transaction for ${eidName} to ${formatOmniPoint(transaction.point)}`
                        )
                        const response = await signer.signAndSend(transaction)

                        logger.debug(
                            `Signed ${ordinal} transaction for ${eidName}, got hash ${response.transactionHash}`
                        )

                        const receipt = await response.wait()
                        logger.debug(`Finished ${ordinal} transaction for ${eidName}`)

                        const result: OmniTransactionWithReceipt = { transaction, receipt }

                        // Here we want to update the global state of the signing
                        successful.push(result)

                        // We'll create a clone of the successful array so that the consumers can't mutate it
                        onProgress?.(result, [...successful])
                    } catch (error) {
                        logger.debug(`Failed to process ${ordinal} transaction for ${eidName}: ${error}`)

                        // Update the error state
                        errors.push({ transaction, error })

                        // We want to stop the moment we hit an error
                        return
                    }
                }

                // Tell the inquisitive user what a good job we did
                logger.debug(`Successfully signed ${n} ${pluralizeNoun(n, 'transaction')} for ${eidName}`)
            })
        )

        // Now we create a list of the transactions that have not been touched
        //
        // We do this by taking all the transactions, then filtering out those
        // that don't have a result associated with them
        //
        // This functionality relies on reference equality of the transactions objects
        // so it's important that we don't mess with those and push the transaction
        // objects directly to the `successful` and `errors` arrays, without any rest spreading or whatnot
        const processed = new Set<OmniTransaction>(successful.map(({ transaction }) => transaction))
        const pending = transactions.filter((transaction) => !processed.has(transaction))

        return [successful, errors, pending]
    }
