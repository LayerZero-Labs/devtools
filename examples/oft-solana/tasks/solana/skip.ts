import { TransactionBuilder, publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { normalizePeer } from '@layerzerolabs/devtools'
import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver } from '@layerzerolabs/lz-solana-sdk-v2'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi'

import { deriveConnection, getExplorerTxLink } from './index'

interface SkipTaskArgs {
    eid: EndpointId // The endpoint ID for the Solana network.
    sender: string // The sender address (hex format).
    receiver: string // The receiver address (base58 format).
    srcEid: number // The source endpoint ID.
    nonce: string // The nonce.
}

// Example: pnpm hardhat lz:oft:solana:skip --eid 40168 --sender <SENDER_OAPP> --receiver <RECEIVER_OAPP> --src-eid 40161 --nonce <NONCE>
task('lz:oft:solana:skip', 'Skip a message on Solana')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168) eid', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address (hex format)', undefined, devtoolsTypes.string)
    .addParam('receiver', 'The receiver address (base58 format)', undefined, devtoolsTypes.string)
    .addParam('srcEid', 'The source endpoint ID', undefined, devtoolsTypes.int)
    .addParam('nonce', 'The nonce', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, sender, receiver, srcEid, nonce }: SkipTaskArgs) => {
        const { umi, connection, umiWalletSigner } = await deriveConnection(eid)
        const endpoint = new EndpointProgram.Endpoint(EndpointProgram.ENDPOINT_PROGRAM_ID)

        const senderNormalized = normalizePeer(sender, srcEid)

        // Convert receiver to Umi PublicKey
        const receiverUmiPublicKey = umiPublicKey(receiver)
        const epDeriver = new EndpointPDADeriver(new PublicKey(EndpointProgram.ENDPOINT_PROGRAM_ID))
        const [nonceAccount] = epDeriver.nonce(new PublicKey(receiver), srcEid, senderNormalized)
        const accountInfo = await connection.getAccountInfo(nonceAccount)
        if (!accountInfo) {
            console.warn('Nonce account not found at address', nonceAccount.toBase58())
            return
        }

        const instruction = endpoint.skip(umiWalletSigner, {
            sender: senderNormalized,
            receiver: receiverUmiPublicKey,
            srcEid,
            nonce: BigInt(nonce),
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
