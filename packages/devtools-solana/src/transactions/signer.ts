import {
    type OmniSigner,
    type OmniTransaction,
    type OmniTransactionReceipt,
    type OmniTransactionResponse,
    OmniSignerBase,
} from '@layerzerolabs/devtools'
import { ConfirmOptions, Connection, sendAndConfirmTransaction, Signer } from '@solana/web3.js'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deserializeTransactionMessage, serializeTransactionBuffer } from './serde'

export class OmniSignerSolana extends OmniSignerBase implements OmniSigner {
    constructor(
        eid: EndpointId,
        public readonly connection: Connection,
        public readonly signer: Signer,
        public readonly confirmOptions: ConfirmOptions = { commitment: 'finalized' }
    ) {
        super(eid)
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

        // Transactions in Solana require a fee payer
        solanaTransaction.feePayer = this.signer.publicKey

        const signature = await sendAndConfirmTransaction(
            this.connection,
            solanaTransaction,
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
}

// export const createSignerFactory = (
//     definition?: SignerDefinition,
//     connectionFactory = createConnectionFactory()
// ): OmniSignerFactory<OmniSignerEVM> => {
//     return pMemoize(async (eid) => {
//         const provider = await providerFactory(eid)
//         const addressOrIndex = await signerAddressorIndexFactory(eid)
//         const signer = provider.getSigner(addressOrIndex)

//         return new OmniSignerEVM(eid, signer)
//     })
// }

// /**
//  * Factory for signer address/index for a specific eid.
//  *
//  * Will take an optional signer definition and either:
//  *
//  * - Return static signer address or index for static signer configuration
//  * - Look up named signer account in hardhat config and return its address
//  *
//  * @param {SignerDefinition} [definition]
//  * @param {EndpointBasedFactory<HardhatRuntimeEnvironment>} [networkEnvironmentFactory]
//  * @returns
//  */
// export const createSignerAddressOrIndexFactory =
//     (
//         definition?: SignerDefinition,
//         networkEnvironmentFactory = createGetHreByEid()
//     ): EndpointBasedFactory<string | number | undefined> =>
//     async (eid) => {
//         // If there is no definition provided, we return nothing
//         if (definition == null) {
//             return undefined
//         }

//         // The hardcoded address and/or index definitions are easy,
//         // they need no resolution and can be used as they are
//         if (definition.type === 'address') {
//             return definition.address
//         }

//         if (definition.type === 'index') {
//             return definition.index
//         }

//         // The named definitions need to be resolved using hre
//         const hre = await networkEnvironmentFactory(eid)
//         const accounts = await hre.getNamedAccounts()
//         const account = accounts[definition.name]

//         assert(account != null, `Missing named account '${definition.name}' for eid ${formatEid(eid)}`)

//         return account
//     }
