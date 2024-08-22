// Import necessary modules and classes from Solana SDKs and other libraries
import assert from 'assert'

import { AuthorityType, mplToolbox, setAuthority, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { createSolanaConnectionFactory } from '../common/utils'
import getFee from '../utils/getFee'

interface Args {
    newAuthority: PublicKey
    mint: PublicKey
    eid: EndpointId
}

// Define a Hardhat task for setting the freeze authority on a Solana mint
task('lz:oft:solana:set-freeze-authority', 'Transfer Solana mint authority to a new account')
    .addParam('newAuthority', 'The Solana address to transfer authority to')
    .addParam('mint', 'The OFT token mint public key')
    .addParam('eid', 'The Solana endpoint ID')
    .setAction(async (taskArgs: Args) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')

        // 1. Setup UMI environment using environment variables (private key and Solana RPC)

        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.eid)

        // Initialize UMI framework with the Solana connection
        const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())

        // Generate a wallet keypair from the private key stored in the environment
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        // Define the mint and new authority public keys
        const mintPublicKey = new PublicKey(taskArgs.mint)
        const newAuthorityPublicKey = new PublicKey(taskArgs.newAuthority)
        const token = fromWeb3JsPublicKey(mintPublicKey)

        // Create the transaction to set the new freeze authority
        const setAuthorityTx = setAuthority(umi, {
            owned: token,
            owner: umiWalletKeyPair.publicKey,
            authorityType: AuthorityType.FreezeAccount,
            newAuthority: fromWeb3JsPublicKey(newAuthorityPublicKey),
        })

        // Fetch simulation compute unit price
        const { averageFeeExcludingZeros } = await getFee(connection)
        const avgComputeUnitPrice = Math.round(averageFeeExcludingZeros)
        const computeUnitPrice = BigInt(avgComputeUnitPrice * 2)

        // Build and send the transaction
        const transaction = await setAuthorityTx
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice }))
            .sendAndConfirm(umi)

        const transactionSignature = bs58.encode(transaction.signature)

        // Provide transaction details
        const metadataUpdateLink = getExplorerLink('tx', transactionSignature.toString(), 'mainnet-beta')
        console.log(`✅ Freeze authority updated! View the transaction here: ${metadataUpdateLink}`)
    })
