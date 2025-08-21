import { TransactionBuilder, publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import { toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'

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

// Example: pnpm hardhat lz:oft:solana:clear --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --src-eid 4016140161 --nonce <NONCE> --guid <GUID> --message <MESSAGE_PAYLOAD>
task('lz:oft:solana:clear', 'Clear a payload on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .addParam('guid', 'The GUID (hex format)', undefined, devtoolsTypes.string)
    .addParam('message', 'The message payload (hex format)', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, srcEid, nonce, guid, message }: ClearTaskArgs) => {
        const { umi, connection, umiWalletKeyPair, umiWalletSigner } = await deriveConnection(eid)
        const endpoint = new EndpointProgram.Endpoint(EndpointProgram.ENDPOINT_PROGRAM_ID)

        // Convert sender from hex to bytes32
        const senderBytes = Buffer.from(sender.replace('0x', ''), 'hex')
        if (senderBytes.length !== 32) {
            throw new Error('Sender must be 32 bytes (64 hex characters)')
        }

        // Convert receiver to Umi PublicKey
        const receiverUmiPublicKey = umiPublicKey(receiver)

        // Convert GUID from hex to bytes
        const guidBytes = Buffer.from(guid.replace('0x', ''), 'hex')
        if (guidBytes.length !== 32) {
            throw new Error('GUID must be 32 bytes (64 hex characters)')
        }

        // Convert message from hex to bytes
        const messageBytes = Buffer.from(message.replace('0x', ''), 'hex')

        // using EndpointProgram.instruction as there's no clear method on EndpointProgram.Endpoint, unlike burn (OAppBurnNonce), nilify (oAppNilify), skip (skip)
        const instruction = EndpointProgram.instructions.clear(
            { programs: endpoint.programRepo },
            {
                signer: umiWalletSigner,
                oappRegistry: endpoint.pda.oappRegistry(receiverUmiPublicKey),
                nonce: endpoint.pda.nonce(receiverUmiPublicKey, srcEid, new Uint8Array(senderBytes)),
                payloadHash: endpoint.pda.payloadHash(
                    receiverUmiPublicKey,
                    srcEid,
                    new Uint8Array(senderBytes),
                    BigInt(nonce)
                ),
                endpoint: endpoint.pda.setting(),
                eventAuthority: endpoint.eventAuthority,
                program: endpoint.programId,
            },
            {
                receiver: receiverUmiPublicKey,
                srcEid,
                sender: new Uint8Array(senderBytes),
                nonce: BigInt(nonce),
                guid: new Uint8Array(guidBytes),
                message: new Uint8Array(messageBytes),
            }
        ).items[0]

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        const keypair = Keypair.fromSecretKey(umiWalletKeyPair.secretKey)
        const tx = new Transaction({
            feePayer: keypair.publicKey,
            blockhash,
            lastValidBlockHeight,
        })

        const builder = new TransactionBuilder([instruction])
        const { signature } = await builder.sendAndConfirm(umi)
        builder.getInstructions().forEach((ix) => tx.add(toWeb3JsInstruction(ix)))

        console.log(
            `Clear transaction successful! View here: ${getExplorerTxLink(
                bs58.encode(signature),
                eid === EndpointId.SOLANA_V2_TESTNET
            )}`
        )
    })
