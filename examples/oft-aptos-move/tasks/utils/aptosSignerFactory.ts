/* eslint-disable import/no-unresolved */
import { AptosAccount, AptosClient, BCS, HexString, TxnBuilderTypes } from 'aptos'

import {
    OmniPoint,
    OmniSigner,
    OmniTransaction,
    OmniTransactionReceipt,
    OmniTransactionResponse,
    formatEid,
} from '@layerzerolabs/devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

import { createAptosConnectionFactory } from './aptosUtils'

export function createAptosSignerFactory(
    privateKeyHex: string,
    connectionFactory = createAptosConnectionFactory()
): (eid: EndpointId) => Promise<OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>> {
    return async function (eid: EndpointId): Promise<OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>> {
        if (endpointIdToChainType(eid) !== ChainType.APTOS) {
            throw new Error(`createAptosSignerFactory() called with non-Aptos EID: ${formatEid(eid)}`)
        }

        const privateKeyBytes = new HexString(privateKeyHex).toUint8Array()
        const client: AptosClient = await connectionFactory(eid)
        const account = new AptosAccount(privateKeyBytes)

        const aptosSigner: OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>> = {
            eid,
            getPoint: () => {
                const point: OmniPoint = { eid, address: account.address().hex() }
                return point
            },
            sign: async (omniTx: OmniTransaction): Promise<string> => {
                const payloadJson = JSON.parse(omniTx.data) as {
                    module: string
                    func: string
                    type_args: string[]
                    args: string[]
                }
                const entryFunction = TxnBuilderTypes.EntryFunction.natural(
                    payloadJson.module,
                    payloadJson.func,
                    (payloadJson.type_args || []).map(
                        (t) => new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString(t))
                    ),
                    payloadJson.args.map((arg: string) => BCS.bcsSerializeStr(arg))
                )
                const payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(entryFunction)
                const rawTx = await client.generateRawTransaction(account.address(), payload, {
                    maxGasAmount: BigInt(1000000),
                    gasUnitPrice: BigInt(100),
                })
                const bcsTxn = AptosClient.generateBCSTransaction(account, rawTx)
                return Buffer.from(bcsTxn).toString('hex')
            },
            signAndSend: async (omniTx: OmniTransaction) => {
                const bcsHex = await aptosSigner.sign(omniTx)
                const bcsTxn = Buffer.from(bcsHex, 'hex')
                const pending = await client.submitSignedBCSTransaction(bcsTxn)
                return {
                    transactionHash: pending.hash,
                    wait: async () => {
                        await client.waitForTransaction(pending.hash)
                        return { transactionHash: pending.hash }
                    },
                }
            },
        }
        return aptosSigner
    }
}
