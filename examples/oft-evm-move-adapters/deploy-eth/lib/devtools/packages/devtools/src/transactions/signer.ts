import { Logger, createModuleLogger, pluralizeNoun, pluralizeOrdinal } from '@layerzerolabs/io-devtools'
import type {
    OmniSigner,
    OmniSignerFactory,
    OmniTransaction,
    OmniTransactionReceipt,
    OmniTransactionResponse,
    OmniTransactionWithError,
    OmniTransactionWithReceipt,
    OmniTransactionWithResponse,
} from './types'
import { formatEid, formatOmniPoint } from '@/omnigraph/format'
import { groupTransactionsByEid } from './utils'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import assert from 'assert'
import type { OmniPoint } from '@/omnigraph'

/**
 * Base class for all signers containing common functionality
 */
export abstract class OmniSignerBase implements OmniSigner {
    /**
     * @deprecated Use `OmniSigner.getPoint()` instead
     */
    public readonly eid: EndpointId

    protected constructor(eid: EndpointId) {
        this.eid = eid
    }

    abstract getPoint(): OmniPoint | Promise<OmniPoint>

    abstract sign(transaction: OmniTransaction): Promise<string>

    abstract signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse>

    /**
     * helper method to ensure that the transaction we are trying to sign is on a correct network
     *
     * @param {OmniTransaction} transaction
     */
    protected assertTransaction(transaction: OmniTransaction) {
        assert(
            transaction.point.eid === this.eid,
            `Could not use signer for ${formatEid(this.eid)} to sign a transaction for ${formatOmniPoint(
                transaction.point
            )}`
        )
    }
}

export type SignAndSendResult = [
    // All the successful transactions
    successful: OmniTransactionWithReceipt[],
    // The failed transactions along with the errors
    errors: OmniTransactionWithError[],
    // All the transactions that have not been executed (including the failed ones)
    pending: OmniTransaction[],
]

export type OnSignAndSendProgress = (
    result: OmniTransactionWithReceipt,
    results: OmniTransactionWithReceipt[]
) => unknown

export type SignAndSend = (
    transactions: OmniTransaction[],
    onProgress?: OnSignAndSendProgress
) => Promise<SignAndSendResult>

/**
 * Creates a sign & send utility for a list of transaction
 * with a help of `OmniSignerFactory`
 *
 * @param {OmniSignerFactory} createSigner
 */
export const createSignAndSend =
    (createSigner: OmniSignerFactory): SignAndSend =>
    async (transactions, onProgress): Promise<SignAndSendResult> => {
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

        const handleSuccess = (result: OmniTransactionWithReceipt) => {
            // Here we want to update the global state of the signing
            successful.push(result)

            // We'll create a clone of the successful array so that the consumers can't mutate it
            onProgress?.(result, [...successful])
        }

        const handleError = (error: OmniTransactionWithError) => {
            // Update the error state
            errors.push(error)
        }

        // Based on this feature flag we'll either wait for every transaction before sending the next one
        // or we submit them all and wait at the very end
        const useBatchedWait = !!process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT
        if (useBatchedWait) {
            logger.warn(`You are using experimental batched transaction waiting`)
        }

        const useBatchedSend = !!process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_SEND
        if (useBatchedSend) {
            logger.warn(`You are using experimental batched transaction sending`)
        }

        // First we create a signer logic based on the batched wait feature flag
        const fallbackSignerLogic: TransactionSignerLogic = useBatchedWait
            ? waitAfterSendingAll
            : waitBeforeSubmittingNext
        // Then we create the final signer logic based on the batched send feature flag
        // The batched send logic will fall back on the default logic if batched send is not available
        const signerLogic = useBatchedSend ? sendBatchedIfAvailable(fallbackSignerLogic) : fallbackSignerLogic

        await Promise.allSettled(
            transactionGroups.map(async ([eid, eidTransactions]): Promise<void> => {
                const eidName = formatEid(eid)

                logger.debug(
                    `Signing ${eidTransactions.length} ${pluralizeNoun(eidTransactions.length, 'transaction')} for ${eidName}`
                )

                logger.debug(`Creating signer for ${eidName}`)
                let signer: OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>

                try {
                    signer = await createSigner(eid)
                } catch (error) {
                    logger.error(`Failed to create a signer for ${eidName}: ${error}`)

                    return handleError({
                        error: new Error(`Failed to create a signer for ${eidName}: ${error}`),
                        transaction: eidTransactions[0]!,
                    })
                }

                await signerLogic(eid, logger, signer, eidTransactions, handleSuccess, handleError)

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

type TransactionSignerLogic = (
    eid: EndpointId,
    logger: Logger,
    signer: OmniSigner,
    transactions: OmniTransaction[],
    onSuccess: (resut: OmniTransactionWithReceipt) => void,
    onError: (error: OmniTransactionWithError) => void
) => Promise<void>

const sendBatchedIfAvailable =
    (fallbackLogic: TransactionSignerLogic): TransactionSignerLogic =>
    async (eid, logger, signer, transactions, onSuccess, onError) => {
        const eidName = formatEid(eid)

        // First we check that we can send batched transactions
        //
        // If we can't we fall back on the fallback logic
        if (signer.signAndSendBatch == null) {
            logger.warn(`Batched transaction sending is not available for ${eidName}, falling back on regular sending`)

            return await fallbackLogic(eid, logger, signer, transactions, onSuccess, onError)
        }

        // For brevity we'll create a variable that holds a string with pluralized label for the transactions
        // e.g. "0 transactions" or "1 transaction"
        const transactionsName = pluralizeNoun(
            transactions.length,
            `1 transaction`,
            `${transactions.length} transactions`
        )

        try {
            logger.debug(`Signing a batch of ${transactionsName} for ${eidName}`)
            const response = await signer.signAndSendBatch(transactions)

            logger.debug(`Signed a batch of ${transactionsName} for ${eidName}, got hash ${response.transactionHash}`)
            const receipt = await response.wait()

            logger.debug(`Finished a batch of ${transactionsName} for ${eidName}`)

            for (const transaction of transactions) {
                onSuccess({ transaction, receipt })
            }
        } catch (error) {
            logger.debug(`Failed to process a batch of ${transactionsName} for ${eidName}: ${error}`)

            for (const transaction of transactions) {
                onError({ transaction, error })
            }
        }
    }

/**
 * This transaction submitting logic will wait for every single transaction
 * before submitting the next one. This is the default logic, it results in transactions
 * being submitted in separate blocks.
 *
 * This is a safer yet slower strategy since:
 *
 * - A revert will only incur costs on the reverted transaction.
 * - A revert will stop the submitting, especially important if the transactions later on in the list
 *   rely heavily on the earlier ones without this reliance being coded into the contract
 */
const waitBeforeSubmittingNext: TransactionSignerLogic = async (
    eid,
    logger,
    signer,
    transactions,
    onSuccess,
    onError
) => {
    const eidName = formatEid(eid)

    for (const [index, transaction] of transactions.entries()) {
        // We want to refer to this transaction by index so we create an ordinal for it (1st, 2nd etc)
        const ordinal = pluralizeOrdinal(index + 1)

        try {
            logger.debug(`Signing ${ordinal} transaction for ${eidName} to ${formatOmniPoint(transaction.point)}`)
            const response = await signer.signAndSend(transaction)

            logger.debug(`Signed ${ordinal} transaction for ${eidName}, got hash ${response.transactionHash}`)

            const receipt = await response.wait()
            logger.debug(`Finished ${ordinal} transaction for ${eidName}`)

            onSuccess({ transaction, receipt })
        } catch (error) {
            logger.debug(`Failed to process ${ordinal} transaction for ${eidName}: ${error}`)

            // Update the error state
            onError({ transaction, error })

            // We want to stop the moment we hit an error
            return
        }
    }
}

/**
 * This transaction submitting logic will submit all transactions first,
 * then wait for them once they all have been submitted. This is an experimental logic, it results in transactions
 * being submitted in potentially the same block.
 *
 * This is a more adventuurous yet faster strategy since:
 *
 * - A revert might incur costs on not only the reverted transaction but on the subsequent transactions as well
 * - A revert will not stop the submitting, especially important if the transactions later on in the list
 *   rely heavily on the earlier ones without this reliance being coded into the contract
 */
const waitAfterSendingAll: TransactionSignerLogic = async (eid, logger, signer, transactions, onSuccess, onError) => {
    const eidName = formatEid(eid)

    const responses: OmniTransactionWithResponse[] = []

    for (const [index, transaction] of transactions.entries()) {
        // We want to refer to this transaction by index so we create an ordinal for it (1st, 2nd etc)
        const ordinal = pluralizeOrdinal(index + 1)

        try {
            logger.debug(`Signing ${ordinal} transaction for ${eidName} to ${formatOmniPoint(transaction.point)}`)
            const response = await signer.signAndSend(transaction)

            logger.debug(`Signed ${ordinal} transaction for ${eidName}, got hash ${response.transactionHash}`)

            responses.push({ transaction, response })
        } catch (error) {
            logger.debug(`Failed to sign ${ordinal} transaction for ${eidName}: ${error}`)

            // Update the error state
            onError({ transaction, error })

            // Stop submitting any other transactions
            break
        }
    }

    for (const [index, { response, transaction }] of responses.entries()) {
        // We want to refer to this transaction by index so we create an ordinal for it (1st, 2nd etc)
        const ordinal = pluralizeOrdinal(index + 1)

        try {
            logger.debug(`Waiting for ${ordinal} transaction for ${eidName} to ${formatOmniPoint(transaction.point)}`)

            const receipt = await response.wait()
            logger.debug(`Finished ${ordinal} transaction for ${eidName}`)

            onSuccess({ transaction, receipt })
        } catch (error) {
            logger.debug(`Failed to process ${ordinal} transaction for ${eidName}: ${error}`)

            // Update the error state
            onError({ transaction, error })
        }
    }
}
