import { TransactionBuilder, publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import { Keypair, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'

import { deriveConnection, getExplorerTxLink } from './index'

interface BurnTaskArgs {
    eid: EndpointId // The endpoint ID for the Solana network.
    sender: string // The sender address (hex format).
    receiver: string // The receiver address (base58 format).
    srcEid: number // The source endpoint ID.
    nonce: string // The nonce.
    payloadHash: string // The payload hash (hex format).
}

// Example: pnpm hardhat lz:oft:solana:burn --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --src-eid 40161 --nonce <NONCE> --payload-hash <PAYLOAD_HASH>
task('lz:oft:solana:burn', 'Burn a nonce on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .addParam('payloadHash', 'The payload hash (hex format)', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, srcEid, nonce, payloadHash }: BurnTaskArgs) => {
        const { umi, connection, umiWalletKeyPair, umiWalletSigner } = await deriveConnection(eid)
        const endpoint = new EndpointProgram.Endpoint(EndpointProgram.ENDPOINT_PROGRAM_ID)
        // Convert sender from hex to bytes32
        const senderBytes = Buffer.from(makeBytes32(sender).replace('0x', ''), 'hex')
        if (senderBytes.length !== 32) {
            throw new Error('Sender must be 32 bytes (64 hex characters)')
        }

        // Convert receiver to Umi PublicKey
        const receiverUmiPublicKey = umiPublicKey(receiver)

        // Convert payload hash from hex to bytes
        const payloadHashBytes = Buffer.from(payloadHash.replace('0x', ''), 'hex')
        if (payloadHashBytes.length !== 32) {
            throw new Error('Payload hash must be 32 bytes (64 hex characters)')
        }

        const instruction = endpoint.oAppBurnNonce(umiWalletSigner, {
            nonce: BigInt(nonce),
            receiver: receiverUmiPublicKey,
            sender: new Uint8Array(senderBytes),
            srcEid,
            payloadHash: new Uint8Array(payloadHashBytes),
        })

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        const keypair = Keypair.fromSecretKey(umiWalletKeyPair.secretKey)
        const tx = new Transaction({
            feePayer: keypair.publicKey,
            blockhash,
            lastValidBlockHeight,
        })

        const builder = new TransactionBuilder([instruction])
        const { signature } = await builder.sendAndConfirm(umi)

        console.log(
            `Burn transaction successful! View here: ${getExplorerTxLink(
                bs58.encode(signature),
                eid === EndpointId.SOLANA_V2_TESTNET
            )}`
        )
    })
