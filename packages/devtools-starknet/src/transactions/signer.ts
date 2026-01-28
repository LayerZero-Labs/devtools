import type { Account, Call, RpcProvider } from 'starknet'
import {
    OmniSigner,
    OmniSignerBase,
    type OmniSignerFactory,
    type OmniTransaction,
    type OmniTransactionReceipt,
    type OmniTransactionResponse,
    OmniPoint,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { deserializeStarknetCalls } from './serde'
import { createModuleLogger, type Logger } from '@layerzerolabs/io-devtools'

export class OmniSignerStarknet extends OmniSignerBase implements OmniSigner {
    constructor(
        eid: EndpointId,
        public readonly provider: RpcProvider,
        public readonly account: Account,
        protected readonly logger: Logger = createModuleLogger('OmniSignerStarknet')
    ) {
        super(eid)
    }

    getPoint(): OmniPoint {
        return { eid: this.eid, address: this.account.address }
    }

    async sign(): Promise<string> {
        throw new Error('Starknet OmniSigner does not support offline signing. Use signAndSend instead.')
    }

    async signAndSend(transaction: OmniTransaction): Promise<OmniTransactionResponse<OmniTransactionReceipt>> {
        this.assertTransaction(transaction)

        const calls = deserializeStarknetCalls(transaction.data) as Call[]
        const response = await this.account.execute(calls)
        const transactionHash = response.transaction_hash

        return {
            transactionHash,
            wait: async () => {
                await this.provider.waitForTransaction(transactionHash)
                return { transactionHash }
            },
        }
    }
}

export type StarknetAccountFactory = (eid: EndpointId) => Promise<Account>
export type StarknetProviderFactory = (eid: EndpointId) => Promise<RpcProvider>

export const createStarknetSignerFactory =
    (
        accountFactory: StarknetAccountFactory,
        providerFactory: StarknetProviderFactory
    ): OmniSignerFactory<OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>> =>
    async (eid: EndpointId) =>
        new OmniSignerStarknet(eid, await providerFactory(eid), await accountFactory(eid))
