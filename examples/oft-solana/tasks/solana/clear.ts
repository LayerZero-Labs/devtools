import { toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Endpoint, instructions } from '@layerzerolabs/lz-solana-sdk-v2'

import { deriveConnection, getExplorerTxLink } from './index'

interface ClearTaskArgs {
    eid: EndpointId // The endpoint ID for the Solana network.
    sender: string // The sender address (hex format).
    receiver: string // The receiver address (base58 format).
    srcEid: number // The source endpoint ID.
    nonce: string // The nonce.
    guid: string // The GUID (hex format).
    message: string // The message payload (hex format).
}

// Example: pnpm hardhat lz:oft:solana:clear --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --src-eid 30168 --nonce <NONCE> --guid <GUID> --message <MESSAGE_PAYLOAD>
task('lz:oft:solana:clear', 'Clear a payload on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .addParam('guid', 'The GUID (hex format)', undefined, devtoolsTypes.string)
    .addParam('message', 'The message payload (hex format)', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, srcEid, nonce, guid, message }: ClearTaskArgs) => {
        if (!process.env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }

        const { connection, umiWalletKeyPair } = await deriveConnection(eid)
        const signer = toWeb3JsKeypair(umiWalletKeyPair)
        const endpoint = new Endpoint(connection, eid)

        // Convert sender from hex to bytes32
        const senderBytes = Buffer.from(sender.replace('0x', ''), 'hex')
        if (senderBytes.length !== 32) {
            throw new Error('Sender must be 32 bytes (64 hex characters)')
        }

        // Convert receiver from base58 to PublicKey
        const receiverPublicKey = new (await import('@solana/web3.js')).PublicKey(receiver)

        // Convert GUID from hex to bytes
        const guidBytes = Buffer.from(guid.replace('0x', ''), 'hex')
        if (guidBytes.length !== 32) {
            throw new Error('GUID must be 32 bytes (64 hex characters)')
        }

        // Convert message from hex to bytes
        const messageBytes = Buffer.from(message.replace('0x', ''), 'hex')

        const instruction = instructions.clear(
            { programs: endpoint.programRepo },
            {
                signer,
                oappRegistry: endpoint.pda.oappRegistry(receiverPublicKey),
                nonce: endpoint.pda.nonce(receiverPublicKey, srcEid, Array.from(senderBytes)),
                payloadHash: endpoint.pda.payloadHash(
                    receiverPublicKey,
                    srcEid,
                    Array.from(senderBytes),
                    BigInt(nonce)
                ),
                endpoint: endpoint.pda.setting(),
                eventAuthority: endpoint.eventAuthority,
                program: endpoint.programId,
            },
            {
                receiver: receiverPublicKey,
                srcEid,
                sender: Array.from(senderBytes),
                nonce: BigInt(nonce),
                guid: Array.from(guidBytes),
                message: Array.from(messageBytes),
            }
        ).items[0]

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
            `Clear transaction successful! View here: ${getExplorerTxLink(
                signature.toString(),
                eid === EndpointId.SOLANA_V2_TESTNET
            )}`
        )
    })
