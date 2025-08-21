import { TransactionBuilder, publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import { Keypair, PublicKey, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'

import { deriveConnection, getExplorerTxLink } from './index'

interface SkipTaskArgs {
    eid: EndpointId // The endpoint ID for the Solana network.
    sender: string // The sender address (hex format).
    receiver: string // The receiver address (base58 format).
    srcEid: number // The source endpoint ID.
    nonce: string // The nonce.
}

// Example: pnpm hardhat lz:oft:solana:skip --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --src-eid 30168 --nonce <NONCE>
task('lz:oft:solana:skip', 'Skip a message on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, srcEid, nonce }: SkipTaskArgs) => {
        const { umi, connection, umiWalletKeyPair, umiWalletSigner } = await deriveConnection(eid)
        const endpoint = new EndpointProgram.Endpoint(EndpointProgram.ENDPOINT_PROGRAM_ID)

        // Convert sender from hex to PublicKey then to Umi PublicKey
        const senderBytes = Buffer.from(sender.replace('0x', ''), 'hex')
        const senderWeb3Pk = new PublicKey(senderBytes)
        const senderUmiPublicKey = umiPublicKey(senderWeb3Pk.toBase58())

        // Convert receiver to Umi PublicKey
        const receiverUmiPublicKey = umiPublicKey(receiver)

        const instruction = endpoint.skip(umiWalletSigner, {
            sender: senderUmiPublicKey,
            receiver: receiverUmiPublicKey,
            srcEid,
            nonce: nonce,
        })

        if (!instruction) {
            console.log('No instruction returned - message may not need to be skipped')
            return
        }

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
            `Skip transaction successful! View here: ${getExplorerTxLink(
                bs58.encode(signature),
                eid === EndpointId.SOLANA_V2_TESTNET
            )}`
        )
    })
