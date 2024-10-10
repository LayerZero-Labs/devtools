import { Keypair as UmiKeypair } from '@metaplex-foundation/umi'
import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import {
    Connection,
    Finality,
    Keypair,
    RpcResponseAndContext,
    SignatureResult,
    TransactionInstruction,
} from '@solana/web3.js'

import { buildVersionedTransaction } from '@layerzerolabs/lz-solana-sdk-v2'

export interface TxResult {
    hash: string
    resp: RpcResponseAndContext<SignatureResult>
}

export const sendAndConfirmTx = async (
    connection: Connection,
    signer: UmiKeypair[] | UmiKeypair, // the first one is the payer
    ixs: TransactionInstruction[],
    commitment: Finality = 'confirmed'
): Promise<TxResult> => {
    const signers: Keypair | Keypair[] = Array.isArray(signer)
        ? signer.map((s) => toWeb3JsKeypair(s))
        : [toWeb3JsKeypair(signer)]
    const tx = await buildVersionedTransaction(connection, signers[0].publicKey, ixs)
    tx.sign(signers)
    const hash = await connection.sendTransaction(tx, { skipPreflight: true })
    const resp = await connection.confirmTransaction(hash, commitment)
    return { hash, resp }
}
