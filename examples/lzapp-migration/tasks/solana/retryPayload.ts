import { web3 } from '@coral-xyz/anchor'
import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { lzReceive } from '@layerzerolabs/lz-solana-sdk-v2'

import { deriveConnection, getExplorerTxLink } from './index'

interface Args {
    srcEid: EndpointId
    nonce: bigint
    sender: string
    dstEid: EndpointId
    receiver: string
    guid: string
    payload: string
    computeUnits: number
    lamports: number
    withPriorityFee: number
}

task('lz:oft:solana:retry-payload', 'Retry a stored payload on Solana')
    .addParam('srcEid', 'The source EndpointId', undefined, types.eid)
    .addParam('nonce', 'The nonce of the payload', undefined, types.bigint)
    .addParam('sender', 'The source OApp address (hex)', undefined, types.string)
    .addParam('dstEid', 'The destination EndpointId (Solana chain)', undefined, types.eid)
    .addParam('receiver', 'The receiver address on the destination Solana chain (bytes58)', undefined, types.string)
    .addParam('guid', 'The GUID of the message (hex)', undefined, types.string)
    .addParam('payload', 'The message payload (hex)', undefined, types.string)
    .addParam('computeUnits', 'The CU for the lzReceive instruction', undefined, types.int)
    .addParam('lamports', 'The lamports for the lzReceive instruction', undefined, types.int)
    .addParam('withPriorityFee', 'The priority fee in microLamports', undefined, types.int)
    .setAction(
        async ({
            srcEid,
            nonce,
            sender,
            dstEid,
            receiver,
            guid,
            payload,
            computeUnits,
            lamports,
            withPriorityFee,
        }: Args) => {
            const { connection, umiWalletKeyPair } = await deriveConnection(dstEid)
            const signer = toWeb3JsKeypair(umiWalletKeyPair)
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            const tx = new web3.Transaction({
                feePayer: signer.publicKey,
                blockhash,
                lastValidBlockHeight,
            })

            const instruction = await lzReceive(
                connection,
                signer.publicKey,
                {
                    nonce: nonce.toString(),
                    srcEid,
                    sender: makeBytes32(sender),
                    dstEid,
                    receiver,
                    payload: '', // unused;  just added to satisfy typing
                    guid,
                    message: payload, // referred to as "payload" in scan-api
                    version: 1, // unused;  just added to satisfy typing
                },
                Uint8Array.from([computeUnits, lamports]),
                'confirmed'
            )

            if (withPriorityFee) {
                tx.add(
                    ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: withPriorityFee,
                    })
                )
            }
            tx.add(instruction)
            tx.recentBlockhash = blockhash

            tx.sign(signer)

            const signature = await sendAndConfirmTransaction(connection, tx, [signer], { skipPreflight: true })
            console.log(
                `View Solana transaction here: ${getExplorerTxLink(signature.toString(), dstEid == EndpointId.SOLANA_V2_TESTNET)}`
            )
        }
    )
