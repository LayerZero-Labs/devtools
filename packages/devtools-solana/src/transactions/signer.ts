import Squads, { Wallet } from '@sqds/sdk'
import {
    type OmniSigner,
    type OmniTransaction,
    type OmniTransactionReceipt,
    type OmniTransactionResponse,
    OmniPoint,
    OmniSignerBase,
} from '@layerzerolabs/devtools'
import {
    ConfirmOptions,
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Signer,
    Transaction,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deserializeTransactionMessage, serializeTransactionBuffer } from './serde'
import { createModuleLogger, type Logger } from '@layerzerolabs/io-devtools'

export class OmniSignerSolana extends OmniSignerBase implements OmniSigner {
    constructor(
        eid: EndpointId,
        public readonly connection: Connection,
        public readonly signer: Signer,
        public readonly lookupAddress?: PublicKey,
        public readonly confirmOptions: ConfirmOptions = { commitment: 'finalized' },
        protected readonly logger: Logger = createModuleLogger('OmniSignerSolana')
    ) {
        super(eid)
    }

    getPoint(): OmniPoint {
        return { eid: this.eid, address: this.signer.publicKey.toBase58() }
    }

    async sign(transaction: OmniTransaction): Promise<string> {
        this.assertTransaction(transaction)

        const solanaTransaction = deserializeTransactionMessage(transaction.data)

        solanaTransaction.sign(this.signer)

        return serializeTransactionBuffer(solanaTransaction.serialize())
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        this.assertTransaction(transaction)

        const solanaTransaction = deserializeTransactionMessage(transaction.data)

        if (this.lookupAddress == null) {
            return await this.signAndSendDefault(solanaTransaction)
        }

        return this.signAndSendVersioned(solanaTransaction, this.lookupAddress)
    }

    protected async signAndSendVersioned(
        transaction: Transaction,
        lookupAddress: PublicKey
    ): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        const { value: lookupTable } = await this.connection.getAddressLookupTable(lookupAddress)
        if (lookupTable == null) {
            return this.signAndSendDefault(transaction)
        }

        const versionedTransaction = new VersionedTransaction(
            new TransactionMessage({
                instructions: transaction.instructions,
                payerKey: transaction.feePayer!,
                recentBlockhash: transaction.recentBlockhash!,
            }).compileToV0Message([lookupTable])
        )

        const signature = await this.connection.sendTransaction(versionedTransaction)

        return {
            transactionHash: signature,
            wait: async () => {
                await this.connection.confirmTransaction(signature, 'finalized')

                return { transactionHash: signature }
            },
        }
    }

    protected async signAndSendDefault(
        transaction: Transaction
    ): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        const signature = await sendAndConfirmTransaction(
            this.connection,
            await this.updateRecentBlockHash(transaction),
            [this.signer],
            this.confirmOptions
        )

        return {
            transactionHash: signature,
            wait: async () => ({
                transactionHash: signature,
            }),
        }
    }

    /**
     * To prevent transactions from expiring, we will update their recentBlockHash values
     * just before signing (if the feature flag is enabled)
     *
     * @param {Transaction} transaction
     * @returns {Promise<Transaction>}
     */
    protected async updateRecentBlockHash(transaction: Transaction): Promise<Transaction> {
        if (!process.env.LZ_ENABLE_EXPERIMENTAL_SOLANA_RECENT_BLOCK_HASH_UPDATE) {
            return transaction
        }

        // If this feature flag is enabled, we'll update the transactions with a new recentBlockHash
        // just in time before signing & sending the transaction
        this.logger.warn(
            `You are using experimental feature to update a recentBlockHash for transactions. Set log level to verbose for more information`
        )

        try {
            const { blockhash } = await this.connection.getLatestBlockhash('finalized')

            this.logger.verbose(
                `Updating transaction recentBlockHash from ${transaction.recentBlockhash} to ${blockhash}`
            )

            transaction.recentBlockhash = blockhash
        } catch (error) {
            this.logger.verbose(`Failed to get recentBlockHash from the network: ${error}`)
        }

        return transaction
    }
}

export class OmniSignerSolanaSquads extends OmniSignerBase implements OmniSigner {
    protected readonly squads: Squads

    constructor(
        eid: EndpointId,
        public readonly connection: Connection,
        public readonly multiSigAddress: PublicKey,
        public readonly wallet: Keypair,
        protected readonly logger: Logger = createModuleLogger('OmniSignerSolanaSquads')
    ) {
        super(eid)

        this.squads = new Squads({ connection, wallet: new Wallet(wallet) })
    }

    getPoint(): OmniPoint {
        return { eid: this.eid, address: this.wallet.publicKey.toBase58() }
    }

    async sign(): Promise<string> {
        throw new Error(`OmniSignerSolanaSquads does not support the sign() method. Please use signAndSend().`)
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        this.assertTransaction(transaction)

        const solanaTransaction = deserializeTransactionMessage(transaction.data)
        const multisigTransaction = await this.squads.createTransaction(this.multiSigAddress, 1)

        for (const instruction of solanaTransaction.instructions) {
            await this.squads.addInstruction(multisigTransaction.publicKey, instruction)
        }

        await this.squads.activateTransaction(multisigTransaction.publicKey)

        const transactionHash = multisigTransaction.publicKey.toBase58()

        return {
            transactionHash,
            wait: async () => ({
                transactionHash,
            }),
        }
    }
}
