import { TransactionBuilder, publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import { toWeb3JsInstruction, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { normalizePeer } from '@layerzerolabs/devtools'
import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'

import { deriveConnection, getExplorerTxLink } from '../index'

import { encodeOFTMessage, generateGuid, getInboundNonce } from './endpointUtils'

interface ClearTaskArgs {
    eid: EndpointId // The endpoint ID for the Solana network.
    sender: string // The sender address (hex format).
    receiver: string // The receiver address (base58 format).
    amountSd: string // The amount to send (human readable units, e.g. "1.5"). // TODO: accept human readable units, e.g. "1.5" instead of amountSD
    srcEid: number // The source endpoint ID.
    nonce: string // The nonce.
    composeMsg?: string // The message payload (hex format).
}

// Example: pnpm hardhat lz:oft:solana:clear --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --src-eid 40161 --nonce <NONCE> --message <MESSAGE_PAYLOAD>
task('lz:oft:solana:clear', 'Clear a payload on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('amountSd', 'The amount to send (human readable units, e.g. "1.5")', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .addOptionalParam('composeMsg', 'The message payload (hex format)', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, amountSd, srcEid, nonce, composeMsg }: ClearTaskArgs) => {
        const { umi, connection, umiWalletKeyPair, umiWalletSigner } = await deriveConnection(eid)
        const endpoint = new EndpointProgram.Endpoint(EndpointProgram.ENDPOINT_PROGRAM_ID)

        // Convert sender from hex to bytes32
        const senderNormalized = normalizePeer(sender, srcEid)

        // Convert receiver to Umi PublicKey
        const receiverUmiPublicKey = umiPublicKey(receiver)

        const inboundNonce = await getInboundNonce(
            umi,
            connection,
            toWeb3JsPublicKey(receiverUmiPublicKey),
            srcEid,
            new Uint8Array(senderNormalized)
        )
        console.log('inboundNonce: ', inboundNonce.toString())

        // BOF nonce value validation
        // For clear, nonce must be equal to or less than inboundNonce
        if (BigInt(nonce) > inboundNonce) {
            throw new Error('Nonce must be equal to or less than inboundNonce')
        }
        // EOF nonce value validation

        const guid = generateGuid(nonce, srcEid, sender, srcEid, receiver)

        // Convert GUID from hex to bytes
        const guidBytes = Buffer.from(guid.replace('0x', ''), 'hex')
        if (guidBytes.length !== 32) {
            throw new Error('GUID must be 32 bytes (64 hex characters)')
        }
        // TODO: take in amount in human readable units, e.g. "1.5" instead of amountSD and convert to amountSD

        const messageBytes = encodeOFTMessage(receiver, BigInt(amountSd), sender, composeMsg)

        // initVerifyIxn
        const initVerifyIxn = endpoint.initVerify(umiWalletSigner, {
            srcEid,
            sender: senderNormalized,
            receiver: receiverUmiPublicKey,
            nonce: BigInt(nonce),
        })

        // using EndpointProgram.instruction as there's no clear method on EndpointProgram.Endpoint, unlike burn (OAppBurnNonce), nilify (oAppNilify), skip (skip)
        const clearIxn = EndpointProgram.instructions.clear(
            { programs: endpoint.programRepo },
            {
                signer: umiWalletSigner,
                oappRegistry: endpoint.pda.oappRegistry(receiverUmiPublicKey),
                nonce: endpoint.pda.nonce(receiverUmiPublicKey, srcEid, new Uint8Array(senderNormalized)),
                payloadHash: endpoint.pda.payloadHash(
                    receiverUmiPublicKey,
                    srcEid,
                    new Uint8Array(senderNormalized),
                    BigInt(nonce)
                ),
                endpoint: endpoint.pda.setting(),
                eventAuthority: endpoint.eventAuthority,
                program: endpoint.programId,
            },
            {
                receiver: receiverUmiPublicKey,
                srcEid,
                sender: new Uint8Array(senderNormalized),
                nonce: BigInt(nonce),
                guid: new Uint8Array(guidBytes),
                message: new Uint8Array(Buffer.from(messageBytes, 'hex')),
            }
        ).items[0]

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        const keypair = Keypair.fromSecretKey(umiWalletKeyPair.secretKey)
        const tx = new Transaction({
            feePayer: keypair.publicKey,
            blockhash,
            lastValidBlockHeight,
        })

        const builder = new TransactionBuilder([clearIxn])
        const { signature } = await builder.sendAndConfirm(umi)
        builder.getInstructions().forEach((ix) => tx.add(toWeb3JsInstruction(ix)))

        console.log(
            `Clear transaction successful! View here: ${getExplorerTxLink(
                bs58.encode(signature),
                eid === EndpointId.SOLANA_V2_TESTNET
            )}`
        )
    })
