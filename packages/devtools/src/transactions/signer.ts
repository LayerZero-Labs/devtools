import { createModuleLogger, pluralizeNoun, pluralizeOrdinal } from '@layerzerolabs/io-devtools'
import type { OmniSignerFactory, OmniTransaction, OmniTransactionWithReceipt } from './types'
import { formatOmniPoint } from '@/omnigraph/format'
import type { OmniError } from '@/omnigraph/types'

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
    ): Promise<[successful: OmniTransactionWithReceipt[], errors: OmniError[]]> => {
        const logger = createModuleLogger('sign & send')

        // Put it here so that we don't need to type like seven toilet rolls of variable names
        const n = transactions.length

        // Just exit when there is nothing to sign
        if (n === 0) return logger.debug(`No transactions to sign, exiting`), [[], []]

        // Tell the user how many we are signing
        logger.debug(`Signing ${n} ${pluralizeNoun(n, 'transaction')}`)

        // We'll gather the successful transactions here
        const successful: OmniTransactionWithReceipt[] = []

        for (const [index, transaction] of transactions.entries()) {
            // We want to refer to this transaction by index so we create an ordinal for it (1st, 2nd etc)
            const ordinal = pluralizeOrdinal(index + 1)

            try {
                logger.debug(`Signing ${ordinal} transaction to ${formatOmniPoint(transaction.point)}`)

                logger.debug(`Creating signer for ${ordinal} transaction`)
                const signer = await createSigner(transaction.point.eid)

                logger.debug(`Signing ${ordinal} transaction`)
                const response = await signer.signAndSend(transaction)

                logger.debug(`Signed ${ordinal} transaction, got hash ${response.transactionHash}`)

                const receipt = await response.wait()
                logger.debug(`Finished ${ordinal} transaction`)

                const result = { transaction, receipt }
                successful.push(result)

                // We'll create a clone of the successful array so that the consumers can't mutate it
                onProgress?.(result, [...successful])
            } catch (error) {
                logger.debug(`Failed to process ${ordinal} transaction: ${error}`)

                return [successful, [{ point: transaction.point, error }]]
            }
        }

        // Tell the inquisitive user what a good job we did
        logger.debug(`Successfully signed ${n} ${pluralizeNoun(n, 'transaction')}`)

        return [successful, []]
    }
