import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Endpoint } from '@layerzerolabs/lz-solana-sdk-v2'

import { deriveConnection, getExplorerTxLink } from './index'

interface SkipTaskArgs {
    eid: EndpointId // The endpoint ID for the Solana network.
    sender: string // The sender address (hex format).
    receiver: string // The receiver address (base58 format).
    srcEid: number // The source endpoint ID.
    nonce: string // The nonce.
}

// Example: npx hardhat lz:oft:solana:skip --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --srcEid 30168 --nonce <NONCE>
task('lz:oft:solana:skip', 'Skip a message on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, srcEid, nonce }: SkipTaskArgs) => {
        if (!process.env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }

        const { connection, umiWalletKeyPair } = await deriveConnection(eid)
        const signer = toWeb3JsKeypair(umiWalletKeyPair)
        const endpoint = new Endpoint(connection, eid)

        // Convert sender from hex to PublicKey
        const senderBytes = Buffer.from(sender.replace('0x', ''), 'hex')
        const senderPublicKey = new (await import('@solana/web3.js')).PublicKey(senderBytes)

        // Convert receiver from base58 to PublicKey
        const receiverPublicKey = new (await import('@solana/web3.js')).PublicKey(receiver)

        const instruction = await endpoint.skip(signer.publicKey, senderPublicKey, receiverPublicKey, srcEid, nonce)

        if (!instruction) {
            console.log('No instruction returned - message may not need to be skipped')
            return
        }

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        const tx = new Transaction({
            feePayer: signer.publicKey,
            blockhash,
            lastValidBlockHeight,
        })

        tx.add(instruction)

        const keypair = (await import('@solana/web3.js')).Keypair.fromSecretKey(
            bs58.decode(process.env.SOLANA_PRIVATE_KEY)
        )
        tx.sign(keypair)

        const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
            skipPreflight: true,
        })

        console.log(
            `Skip transaction successful! View here: ${getExplorerTxLink(
                signature.toString(),
                eid === EndpointId.SOLANA_V2_TESTNET
            )}`
        )
    })
