// Import necessary modules and classes from Solana SDKs and other libraries
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { AuthorityType, mplToolbox, setAuthority, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import getFee from '../utils/getFee'

// Define a Hardhat task for setting the freeze authority on a Solana mint
task('lz:oft:solana:set-freeze-authority', 'Transfer Solana mint authority to a new account')
    .addParam('newAuthority', 'The Solana address to transfer authority to')
    .addParam('mint', 'The OFT token mint public key')
    .setAction(async (taskArgs: TaskArguments) => {
        if (!env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }
        // Set up Solana connection
        const rpcUrlSolana: string = env.RPC_URL_SOLANA?.toString() ?? 'default_url'

        // Initialize UMI framework with the Solana connection
        const umi = createUmi(rpcUrlSolana).use(mplToolbox())
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY))
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        // Define the mint and new authority public keys
        const mintPublicKey = new PublicKey(taskArgs.mint)
        const newAuthorityPublicKey = new PublicKey(taskArgs.newAuthority)
        const token = fromWeb3JsPublicKey(mintPublicKey)

        // Create the transaction to set the new freeze authority
        const setAuthorityTx = await setAuthority(umi, {
            owned: token,
            owner: umiWalletKeyPair.publicKey,
            authorityType: AuthorityType.FreezeAccount,
            newAuthority: fromWeb3JsPublicKey(newAuthorityPublicKey),
        })

        // Fetch simulation compute unit price
        const { averageFeeExcludingZeros } = await getFee()
        const avgComputeUnitPrice = Math.round(averageFeeExcludingZeros)
        const computeUnitPrice = BigInt(avgComputeUnitPrice * 1.1)

        // Build and send the transaction
        const transactionSignature = await setAuthorityTx
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice }))
            .sendAndConfirm(umi)

        console.log(`Transaction successful with signature: ${transactionSignature}`)
    })
