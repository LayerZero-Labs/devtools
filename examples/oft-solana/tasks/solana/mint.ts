import assert from 'assert'

import { mplToolbox } from '@metaplex-foundation/mpl-toolbox'
import { createSignerFromKeypair, publicKey } from '@metaplex-foundation/umi'
import { Keypair as UmiKeypair } from '@metaplex-foundation/umi/dist/types/Keypair'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { createMintToInstruction } from '@solana/spl-token'
import {
    Connection,
    Finality,
    Keypair,
    PublicKey,
    RpcResponseAndContext,
    SignatureResult,
    TransactionInstruction,
} from '@solana/web3.js'
import bs58 from 'bs58'

import { buildVersionedTransaction } from '@layerzerolabs/lz-solana-sdk-v2'

import { createSolanaConnectionFactory } from '../common/utils'

const main = async () => {
    const privateKey = process.env.SOLANA_PRIVATE_KEY
    assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')
    const connectionFactory = createSolanaConnectionFactory()
    const connection = await connectionFactory(40168)
    // Initialize UMI with the Solana RPC URL and necessary tools
    const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
    const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))
    const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
    const multiSigKey = new PublicKey('GN1cUpZwMh72q6Pkuxq4rLEwzKhe7ficR2ij1WZ4uo1p')

    const mintPK = publicKey('2p8q6vp97JZRgM5rtx9ZAxcK8GzHsVwCR1xaxGkBqRew')

    const mintIx = createMintToInstruction(
        toWeb3JsPublicKey(mintPK),
        new PublicKey('HbZ9Xj3EnAmY8ATAqXCvtbEYvWGrURaYsiSsAdSHn4fh'),
        multiSigKey,
        1_000_000_000_000_000_000_000_000n,
        [toWeb3JsKeypair(umiWalletKeyPair)]
    )
    const txResult = await sendAndConfirmTx(connection, umiWalletKeyPair, [mintIx])
    console.dir(txResult, { depth: null })
}

const sendAndConfirmTx = async (
    connection: Connection,
    signer: UmiKeypair[] | UmiKeypair, // the first one is the payer
    ixs: TransactionInstruction[],
    commitment: Finality = 'confirmed'
): Promise<{ hash: string; resp: RpcResponseAndContext<SignatureResult> }> => {
    const signers: Keypair | Keypair[] = Array.isArray(signer)
        ? signer.map((s) => toWeb3JsKeypair(s))
        : [toWeb3JsKeypair(signer)]
    const tx = await buildVersionedTransaction(connection, signers[0].publicKey, ixs)
    tx.sign(signers)
    const hash = await connection.sendTransaction(tx, { skipPreflight: true })
    const resp = await connection.confirmTransaction(hash, commitment)
    return { hash, resp }
}

main()
