// tasks/solana/clearWithAlt.ts
import { createSignerFromKeypair } from '@metaplex-foundation/umi'
import { toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Transaction } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointProgram, extractComposeSentEventByTxHash, lzCompose } from '@layerzerolabs/lz-solana-sdk-v2'

import { deriveConnection } from '.'

interface Args {
    srcTxHash: string
    mnemonic?: string
}

task(
    'lz:oapp:solana:clear-with-alt',
    'Fetch a ComposeSent event by source-tx and clear it on Solana in one ALT-packed tx'
)
    .addParam('srcTxHash', 'The source transaction hash')
    .addOptionalParam('mnemonic', 'Your wallet mnemonic (or set MNEMONIC env var)', process.env.MNEMONIC)
    .setAction(async ({ srcTxHash, mnemonic }: Args, hre) => {
        // 1) Build UMI + RPC connection
        // Set up connection and wallet
        // Fetch message metadata
        const response = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${srcTxHash}`)
        const data = await response.json()
        const message = data.data?.[0]
        const dstTxHash = message.destination.tx.txHash
        console.log('message', message)

        // Set up connection and wallet
        const { umi, umiWalletSigner, connection } = await deriveConnection(message.pathway.dstEid as EndpointId)
        const signer = createSignerFromKeypair(umi, umiWalletSigner)
        const web3Signer = toWeb3JsKeypair(umiWalletSigner)

        // 2) Look up the ComposeSent event from your source tx
        const events = await extractComposeSentEventByTxHash(connection, EndpointProgram.PROGRAM_ID, dstTxHash)
        if (!events || events.length === 0) {
            throw new Error(`No ComposeSent event found for ${dstTxHash}`)
        }
        const event = events[0]

        // 4) Build the lzCompose instruction
        const ix = await lzCompose(connection, toWeb3JsPublicKey(signer.publicKey), event)

        // 1) Build your Instruction exactly as before
        const tx = new Transaction()
        tx.add(ix)
        tx.feePayer = toWeb3JsPublicKey(signer.publicKey)

        // 2) Fetch a recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed')
        tx.recentBlockhash = blockhash

        // 3) Sign the transaction (`payer` must sign; adjust if you have more signers)
        tx.sign(web3Signer)
        const signedTx = tx

        // 4) Send *without* preflight
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: 'confirmed',
        })

        // 5) Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed')

        // 6) Fetch the *on-chain* logs
        const txInfo = await connection.getTransaction(signature, { commitment: 'confirmed' })
        console.log('On-chain logs:\n', txInfo?.meta?.logMessages?.join('\n'))

        //   const umiInstruction = {
        //     programId: publicKey(ix.programId.toBase58()),
        //     keys: ix.keys.map((key) => ({
        //         pubkey: publicKey(key.pubkey.toBase58()),
        //         isSigner: key.isSigner,
        //         isWritable: key.isWritable,
        //     })),
        //     data: ix.data,
        // }
        // let txBuilder = transactionBuilder().add({
        //     instruction: umiInstruction,
        //     signers: [umiWalletSigner], // Include all required signers here
        //     bytesCreatedOnChain: 0,
        // })

        // const { signature } = await txBuilder.sendAndConfirm(umi, {
        //   skipPreflight:       true,
        //   preflightCommitment: 'confirmed',
        // })
        // console.log(
        //   `lzCompose: ${getExplorerTxLink(bs58.encode(signature), false)}`
        // )
    })
