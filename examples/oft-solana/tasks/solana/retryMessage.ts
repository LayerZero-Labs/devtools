import { web3 } from '@coral-xyz/anchor'
import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { ComputeBudgetProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
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

// Run: npx hardhat lz:oft:solana:retry-message --src-eid <srcEid> --nonce <nonce> --sender <SRC_OAPP> --dst-eid <dstEid> --receiver <OFT_STORE> --guid <GUID> --message <MESSAGE> --with-compute-unit-limit <CU_LIMIT> --lamports <LAMPORTS> --with-compute-unit-price <microLamports>
task('lz:oft:solana:retry-message', 'Retry a stored message on Solana')
    .addParam('srcEid', 'The source EndpointId', undefined, types.eid)
    .addParam('nonce', 'The nonce of the message', undefined, types.bigint)
    .addParam('sender', 'The source OApp address (hex)', undefined, types.string)
    .addParam('dstEid', 'The destination EndpointId (Solana chain)', undefined, types.eid)
    .addParam('receiver', 'The receiver address on the destination Solana chain (bytes58)', undefined, types.string)
    .addParam('guid', 'The GUID of the message (hex)', undefined, types.string)
    .addParam('message', 'The message data in hex format', undefined, types.string)
    .addParam('lamports', 'The lamports for the lzReceive instruction', undefined, types.int)
    .addParam('withComputeUnitLimit', 'The CU for the lzReceive instruction', undefined, types.int)
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
            lamports,
            withComputeUnitLimit,
            withComputeUnitPrice,
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

            const keypair = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY))
            tx.sign(keypair)

            const signature = await sendAndConfirmTransaction(connection, tx, [keypair], { skipPreflight: true })
            console.log(
                `View Solana transaction here: ${getExplorerTxLink(signature.toString(), dstEid == EndpointId.SOLANA_V2_TESTNET)}`
            )
        }
    )
