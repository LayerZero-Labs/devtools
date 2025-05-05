import { arrayify } from '@ethersproject/bytes'
import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { lzCompose } from '@layerzerolabs/lz-solana-sdk-v2'

import { deriveConnection } from './index'

interface Args {
    srcTxHash: string
}

task('lz:oapp:solana:clear-with-alt', 'Clear a stored payload on Solana')
    .addParam('srcTxHash', 'The source transaction hash', undefined, types.string)
    .setAction(async ({ srcTxHash }: Args) => {
        if (!process.env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }

        // Fetch message metadata
        const response = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${srcTxHash}`)
        const data = await response.json()
        const message = data.data?.[0]

        // Set up connection and wallet
        const { connection, umiWalletKeyPair } = await deriveConnection(message.pathway.dstEid as EndpointId)
        const signer = toWeb3JsKeypair(umiWalletKeyPair)
        const guidBytes = arrayify(message.guid)

        // Build the lzReceive (compose) instruction
        const lzComposeInstruction = await lzCompose(
            connection,
            signer.publicKey,
            {
                from: new PublicKey(message.pathway.receiver.address),
                to: new PublicKey('9eT5hbJ82Ng9khRa2K8pEjji79j7H9ieeeYmM8cCAeQP'),
                guid: Array.from(guidBytes),
                index: message.pathway.nonce,
                message: arrayify(message.source.tx.payload),
            },
            new Uint8Array(),
            'confirmed'
        )

        // Build and sign transaction
        const { blockhash } = await connection.getLatestBlockhash('confirmed')
        const txMessage = new TransactionMessage({
            payerKey: signer.publicKey,
            recentBlockhash: blockhash,
            instructions: [lzComposeInstruction],
        }).compileToV0Message()

        const tx = new VersionedTransaction(txMessage)
        tx.sign([signer])

        // Log serialized transaction
        console.log(Buffer.from(tx.serialize()).toString('base64'))

        // Optional: simulate
        const simulation = await connection.simulateTransaction(tx, { sigVerify: true })
        console.log('simulation', simulation)

        // Send
        const sig = await connection.sendTransaction(tx)
        console.log('lzReceive tx signature', sig)
    })
