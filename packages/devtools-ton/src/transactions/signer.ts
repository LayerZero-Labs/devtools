import {
    type OmniPoint,
    OmniSignerBase,
    type OmniTransaction,
    type OmniTransactionResponse,
    type OmniSigner,
    AsyncRetriable,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { Cell } from '@ton/core'
import type { OpenedContract, Contract, ContractProvider, MessageRelaxed } from '@ton/core'
import { TonClient } from '@ton/ton'
import type { KeyPair } from '@ton/crypto'
import { deserializeMessagesRelaxed } from './serde'
import assert from 'assert'
import { createIsCellInTransaction, hasTransactionBounced, isTransactionSuccessful } from './state'
import { createModuleLogger, Logger } from '@layerzerolabs/io-devtools'

export interface IWalletContractCreateTransferArgs {
    seqno: number
    secretKey: Buffer
    messages: MessageRelaxed[]
}

export interface IWalletContract extends Contract {
    /**
     * Get Wallet Seqno
     */
    getSeqno(provider: ContractProvider): Promise<number>

    /**
     * Create transfer cell
     * @param args
     */
    createTransfer(args: IWalletContractCreateTransferArgs): Promise<Cell> | Cell

    /**
     * Send signed transfer
     */
    send(provider: ContractProvider, message: Cell): Promise<void>
}

export class OmniSignerTON<TWalletContract extends IWalletContract> extends OmniSignerBase implements OmniSigner {
    // Due to generic type parameter resolution limitations, this needs to be typed as OpenedContract<IWalletContract>
    // rather than OpenedContract<TWalletContract>
    //
    // Using TWalletContract as the type parameter breaks the type inference for the OpenedContract type
    protected readonly openWallet: OpenedContract<IWalletContract>

    constructor(
        eid: EndpointId,
        public readonly keyPair: KeyPair,
        public readonly wallet: TWalletContract,
        public readonly client: TonClient,
        protected readonly logger: Logger = createModuleLogger('OmniSignerTON')
    ) {
        super(eid)

        this.openWallet = client.open(wallet)
    }

    override getPoint(): OmniPoint | Promise<OmniPoint> {
        return { eid: this.eid, address: `0:${this.openWallet.address.hash.toString('hex')}` }
    }

    override async sign(_transaction: OmniTransaction): Promise<string> {
        const seqno = await this.openWallet.getSeqno()
        return (
            await this.wallet.createTransfer({
                seqno,
                secretKey: this.keyPair.secretKey,
                messages: deserializeMessagesRelaxed(_transaction.data),
            })
        )
            .toBoc()
            .toString('base64')
    }

    override async signAndSend(omniTransaction: OmniTransaction): Promise<OmniTransactionResponse> {
        const cell = Cell.fromBase64(await this.sign(omniTransaction))

        await this.openWallet.send(cell)

        const transaction = await this.waitForCellSubmitted(cell)
        const transactionHash = transaction.hash().toString('base64')

        return {
            transactionHash,
            // This wait function does not really wait at this moment, it just gets the transaction state again
            // and checks whether the phases have completed successfully
            //
            // API V3 is required to investigate transaction traces for pending and finalized states.
            //
            // The guarantee that we rely on is that if two transactions have been submitted in order,
            // their messages will be executed in order even if the later transactions don't wait for the earlier ones to finish
            wait: async () => {
                const transactionState = await this.client.getTransaction(
                    this.wallet.address,
                    transaction.lt.toString(),
                    transactionHash
                )
                assert(transactionState != null, `Transaction '${transactionHash}' missing from the API`)
                assert(!hasTransactionBounced(transactionState), `Transaction '${transactionHash}' has bounced`)
                assert(isTransactionSuccessful(transactionState), `Transaction '${transactionHash}' has not succeeded`)
                return { transactionHash }
            },
        }
    }

    @AsyncRetriable({
        // We'll use the AsyncRetriable with infinite retries to provide us with a exponential backoff retry logic
        enabled: true,
        numAttempts: Number.POSITIVE_INFINITY,
        maxDelay: 1_000,
        onRetry: () => {}, //need this to prevent trying to log error that is too large
    })
    protected async waitForCellSubmitted(cell: Cell, limit: number = 100) {
        const transactions = await this.client.getTransactions(this.wallet.address, {
            limit,
        })

        const transaction = transactions.find(createIsCellInTransaction(cell))
        assert(transaction != null, `Failed to locate cell ${cell.toString()} among the last ${limit} transactions`)
        return transaction
    }
}
