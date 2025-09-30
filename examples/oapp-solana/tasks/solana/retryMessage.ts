import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { ComputeBudgetProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
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
    message: string
    withComputeUnitLimit: number
    lamports: number
    withComputeUnitPrice: number
}

// Run: npx hardhat lz:oapp:solana:retry-message --src-eid <srcEid> --nonce <nonce> --sender <SRC_OAPP> --dst-eid <dstEid> --receiver <RECEIVER> --guid <GUID> --message <MESSAGE> --with-compute-unit-limit <CU_LIMIT> --lamports <LAMPORTS> --with-compute-unit-price <microLamports>
task('lz:oapp:solana:retry-message', 'Retry a stored message on Solana')
    .addParam('srcEid', 'The source EndpointId', undefined, types.eid)
    .addParam('nonce', 'The nonce of the message', undefined, types.bigint)
    .addParam('sender', 'The source OApp address (hex)', undefined, types.string)
    .addParam('dstEid', 'The destination EndpointId (Solana chain)', undefined, types.eid)
    .addParam('receiver', 'The receiver address on the destination Solana chain (bytes58)', undefined, types.string)
    .addParam('guid', 'The GUID of the message (hex)', undefined, types.string)
    .addParam('message', 'The message data in hex format', undefined, types.string)
    .addParam('withComputeUnitLimit', 'The CU for the lzReceive instruction', undefined, types.int)
    .addParam('lamports', 'The lamports for the lzReceive instruction', undefined, types.int)
    .addParam('withComputeUnitPrice', 'The priority fee in microLamports', undefined, types.int)
    .setAction(
        async ({
            srcEid,
            nonce,
            sender,
            dstEid,
            receiver,
            guid,
            message,
            withComputeUnitLimit,
            lamports,
            withComputeUnitPrice,
        }: Args) => {
            const { connection, umiWalletKeyPair } = await deriveConnection(dstEid)
            const signer = toWeb3JsKeypair(umiWalletKeyPair)
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            const tx = new Transaction({
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
                    receiver,
                    guid,
                    message,
                },
                Uint8Array.from([withComputeUnitLimit, lamports]),
                'confirmed'
            )

            if (withComputeUnitPrice) {
                tx.add(
                    ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: withComputeUnitPrice,
                    })
                )
            }
            tx.add(instruction)
            tx.recentBlockhash = blockhash

            tx.sign(signer)

            const signature = await sendAndConfirmTransaction(connection, tx, [signer])
            console.log(
                `View Solana transaction here: ${getExplorerTxLink(signature.toString(), dstEid == EndpointId.SOLANA_V2_TESTNET)}`
            )
        }
    )
