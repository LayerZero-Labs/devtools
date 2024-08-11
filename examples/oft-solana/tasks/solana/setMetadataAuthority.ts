// Import necessary modules and classes
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import {
    fetchMetadataFromSeeds,
    mplTokenMetadata,
    updateAsUpdateAuthorityV2,
} from '@metaplex-foundation/mpl-token-metadata'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

// Define a Hardhat task to set the metadata update authority for a token mint
task('lz:oft:solana:set-metadata-authority', 'Transfers the account metadata authority for the provided mint')
    .addParam('mint', 'The token mint public key to update')
    .addParam('newAuthority', 'The new update authority public key')
    .setAction(async (taskArgs: TaskArguments) => {
        // Set up Solana connection and UMI framework
        const rpcUrlSolana: string = env.RPC_URL_SOLANA?.toString() ?? 'default_url'
        const umi = createUmi(rpcUrlSolana).use(mplTokenMetadata())

        // Decode private key and create keypair for signing
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY!))
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        // Convert public keys to UMI format
        const mintPublicKey = new PublicKey(taskArgs.mint)
        const newAuthorityPublicKey = new PublicKey(taskArgs.newAuthority)
        const umiMintPublicKey = fromWeb3JsPublicKey(mintPublicKey)
        const umiNewAuthorityPublicKey = fromWeb3JsPublicKey(newAuthorityPublicKey)

        try {
            // Fetch initial metadata for the mint
            const initialMetadata = await fetchMetadataFromSeeds(umi, { mint: umiMintPublicKey })
            console.log('Initial metadata:', initialMetadata)

            // Create update instruction to set the new authority
            const updateInstruction = updateAsUpdateAuthorityV2(umi, {
                mint: umiMintPublicKey,
                authority: umiWalletSigner,
                data: {
                    ...initialMetadata, // Keep existing metadata
                },
                newUpdateAuthority: umiNewAuthorityPublicKey,
                isMutable: true,
            })

            // Build and send the transaction
            const builder = new TransactionBuilder().add(updateInstruction)
            const transactionResult = await builder.sendAndConfirm(umi)
            const transactionSignature = bs58.encode(transactionResult.signature)

            // Provide transaction details
            const metadataUpdateLink = getExplorerLink('tx', transactionSignature.toString(), 'mainnet-beta')
            console.log(`✅ Metadata authority updated! View the transaction here: ${metadataUpdateLink}`)

            // Fetch and display new metadata to confirm update
            const newMetadata = await fetchMetadataFromSeeds(umi, { mint: umiMintPublicKey })
            console.log('New metadata:', newMetadata)
        } catch (error) {
            console.error('Error updating metadata authority:', error)
        }
    })
