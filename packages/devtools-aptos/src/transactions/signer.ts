import {
    Account,
    Aptos,
    Ed25519PrivateKey,
    PrivateKey,
    PrivateKeyVariants,
    RawTransaction,
    SimpleTransaction,
} from '@aptos-labs/ts-sdk'
import type {
    OmniSignerFactory,
    OmniTransaction,
    OmniTransactionResponse,
    OmniTransactionReceipt,
} from '@layerzerolabs/devtools'
import { OmniSignerBase, formatEid } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { createModuleLogger } from '@layerzerolabs/io-devtools'

import type { ConnectionFactory } from '../connection/types'
import type { SerializedAptosTransaction } from './types'

const logger = createModuleLogger('aptos-signer')

/**
 * Aptos implementation of OmniSigner
 *
 * This signer handles Aptos transaction signing and submission using the @aptos-labs/ts-sdk
 */
export class AptosSigner extends OmniSignerBase {
    private sequenceNumber: number = 0
    private sequenceNumberSynced: boolean = false

    constructor(
        eid: EndpointId,
        private readonly aptos: Aptos,
        private readonly account: Account
    ) {
        // Cast to any to handle potential lz-definitions version mismatches between packages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(eid as any)
    }

    getPoint() {
        return {
            eid: this.eid,
            address: this.account.accountAddress.toString(),
        }
    }

    /**
     * Sync the sequence number from the chain
     */
    private async syncSequenceNumber(): Promise<void> {
        const accountData = await this.aptos.getAccountInfo({
            accountAddress: this.account.accountAddress,
        })
        this.sequenceNumber = parseInt(accountData.sequence_number)
        this.sequenceNumberSynced = true
    }

    /**
     * Build and sign an Aptos transaction (returns BCS hex string)
     */
    async sign(transaction: OmniTransaction): Promise<string> {
        this.assertTransaction(transaction)

        // Ensure we have the current sequence number
        if (!this.sequenceNumberSynced) {
            await this.syncSequenceNumber()
        }

        // Parse the transaction data
        const payload: SerializedAptosTransaction = JSON.parse(transaction.data)

        // Build the transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const simpleTx = await this.aptos.transaction.build.simple({
            sender: this.account.accountAddress,
            data: {
                function: payload.function as `${string}::${string}::${string}`,
                typeArguments: payload.typeArguments,
                functionArguments: payload.functionArguments as any[],
            },
        })

        // Sign the transaction
        const signedTx = this.aptos.transaction.sign({
            signer: this.account,
            transaction: simpleTx,
        })

        // Return the signature as hex
        return signedTx.bcsToHex().toString()
    }

    /**
     * Sign and submit a transaction
     */
    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        this.assertTransaction(transaction)

        const maxRetries = 3
        let retryCount = 0

        while (retryCount < maxRetries) {
            try {
                // Ensure we have the current sequence number
                if (!this.sequenceNumberSynced) {
                    await this.syncSequenceNumber()
                }

                // Parse the transaction data
                const payload: SerializedAptosTransaction = JSON.parse(transaction.data)

                logger.debug(
                    `Submitting Aptos transaction: ${payload.function} with sequence number ${this.sequenceNumber}`
                )

                // Build the transaction
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const simpleTx = await this.aptos.transaction.build.simple({
                    sender: this.account.accountAddress,
                    data: {
                        function: payload.function as `${string}::${string}::${string}`,
                        typeArguments: payload.typeArguments,
                        functionArguments: payload.functionArguments as any[],
                    },
                })

                // Create a new raw transaction with our tracked sequence number
                const newRawTransaction = new RawTransaction(
                    simpleTx.rawTransaction.sender,
                    BigInt(this.sequenceNumber),
                    simpleTx.rawTransaction.payload,
                    simpleTx.rawTransaction.max_gas_amount,
                    simpleTx.rawTransaction.gas_unit_price,
                    simpleTx.rawTransaction.expiration_timestamp_secs,
                    simpleTx.rawTransaction.chain_id
                )
                const transactionWithSequence = new SimpleTransaction(newRawTransaction)

                // Sign and submit
                const response = await this.aptos.signAndSubmitTransaction({
                    signer: this.account,
                    transaction: transactionWithSequence,
                })

                // Increment our tracked sequence number
                this.sequenceNumber++

                const transactionHash = response.hash

                return {
                    transactionHash,
                    wait: async (_confirmations?: number): Promise<OmniTransactionReceipt> => {
                        // Wait a bit for propagation
                        await new Promise((resolve) => setTimeout(resolve, 2000))

                        // Wait for the transaction to be executed
                        await this.aptos.waitForTransaction({
                            transactionHash,
                        })

                        return { transactionHash }
                    },
                }
            } catch (error: unknown) {
                retryCount++
                if (retryCount === maxRetries) {
                    logger.error(`Failed to submit Aptos transaction after ${maxRetries} attempts`)
                    throw error
                }

                logger.warn(
                    `Aptos transaction failed (attempt ${retryCount}/${maxRetries}), retrying: ${error instanceof Error ? error.message : String(error)}`
                )

                // Re-sync sequence number and retry
                await this.syncSequenceNumber()
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }

        // This should never be reached due to the throw in the loop
        throw new Error('Unexpected error in signAndSend')
    }
}

/**
 * Creates a signer factory for Aptos networks
 *
 * @param connectionFactory - Factory for creating Aptos client connections
 * @param privateKey - Optional private key. If not provided, reads from APTOS_PRIVATE_KEY env var
 * @returns OmniSignerFactory that creates AptosSigner instances
 */
export const createSignerFactory = (
    connectionFactory: ConnectionFactory,
    privateKey?: string
): OmniSignerFactory<AptosSigner> => {
    return async (eid: EndpointId): Promise<AptosSigner> => {
        // Validate chain type
        if (endpointIdToChainType(eid) !== ChainType.APTOS) {
            // Cast to any to handle potential lz-definitions version mismatches between packages
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(`createAptosSignerFactory() called with non-Aptos EID: ${formatEid(eid as any)}`)
        }

        // Get the private key
        const pk = privateKey ?? process.env.APTOS_PRIVATE_KEY
        if (!pk) {
            throw new Error('APTOS_PRIVATE_KEY environment variable is required')
        }

        // Format the private key
        const formattedKey = PrivateKey.formatPrivateKey(pk, PrivateKeyVariants.Ed25519)

        // Create the account
        const account = Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(formattedKey),
        })

        // Get the Aptos client
        const aptos = await connectionFactory(eid)

        return new AptosSigner(eid, aptos, account)
    }
}
