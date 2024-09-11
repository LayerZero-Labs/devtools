// Import necessary modules and classes
import assert from 'assert'

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
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { createSolanaConnectionFactory } from '../common/utils'

interface Args {
    newAuthority: PublicKey
    mint: PublicKey
    eid: EndpointId
}

// Define a Hardhat task to set the metadata update authority for a token mint
task('lz:oft:solana:set-metadata-authority', 'Transfers the account metadata authority for the provided mint')
    .addParam('mint', 'The token mint public key to update')
    .addParam('newAuthority', 'The new update authority public key')
    .addParam('eid', 'The Solana endpoint ID')
    .setAction(async (taskArgs: Args) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')

        // 1. Setup UMI environment using environment variables (private key and Solana RPC)

        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.eid)

        // Initialize UMI framework with the Solana connection
        const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata())

        // Generate a wallet keypair from the private key stored in the environment
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))
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
