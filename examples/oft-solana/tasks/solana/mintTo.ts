// Import necessary modules and classes from Solana SDKs and other libraries
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, fromWeb3JsPublicKey, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import getFee from '../utils/getFee'

// Define a Hardhat task for minting tokens on Solana using the OFT pass-through
task('lz:oft:solana:mint', 'Mint tokens on Solana using OFT pass-through')
    .addParam('amount', 'The amount of tokens to send')
    .addParam('mint', 'The OFT token mint public key')
    .addParam('to', 'The recipient address on Solana')
    .addParam('program', 'The OFT program ID')
    .addParam('staging', 'Solana mainnet or testnet environment')
    .setAction(async (taskArgs: TaskArguments) => {
        if (!env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }

        // Determine RPC URL based on network staging (mainnet or testnet)
        const RPC_URL_SOLANA =
            taskArgs.staging === 'mainnet'
                ? env.RPC_URL_SOLANA?.toString() ?? clusterApiUrl('mainnet-beta')
                : env.RPC_URL_SOLANA_TESTNET?.toString() ?? clusterApiUrl('devnet')

        // Initialize Solana connection and UMI framework
        const connection = new Connection(RPC_URL_SOLANA)
        const umi = createUmi(RPC_URL_SOLANA).use(mplToolbox())
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY))
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        // Define OFT program and token mint public keys
        const oftProgramId = new PublicKey(taskArgs.program)
        const mintPublicKey = new PublicKey(taskArgs.mint)
        const toPublicKey = new PublicKey(taskArgs.to)
        const umiMintPublicKey = fromWeb3JsPublicKey(mintPublicKey)

        const web3TokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            web3WalletKeyPair,
            mintPublicKey,
            toPublicKey,
            undefined,
            'finalized'
        )

        // Fetch token metadata
        const mintInfo = (await fetchDigitalAsset(umi, umiMintPublicKey)).mint
        const amount = taskArgs.amount * 10 ** mintInfo.decimals

        const oftMintIx = await OftTools.createMintToIx(
            web3WalletKeyPair.publicKey,
            mintPublicKey,
            web3TokenAccount.address, // which account to mint to?
            BigInt(amount),
            TOKEN_PROGRAM_ID,
            oftProgramId
        )

        // Convert the instruction and create the transaction builder
        const convertedInstruction = fromWeb3JsInstruction(oftMintIx)
        const transactionBuilder = new TransactionBuilder([
            {
                instruction: convertedInstruction,
                signers: [umiWalletSigner],
                bytesCreatedOnChain: 0,
            },
        ])

        // Fetch simulation compute units and set compute unit price
        const { averageFeeExcludingZeros } = await getFee()
        const priorityFee = Math.round(averageFeeExcludingZeros)
        const computeUnitPrice = BigInt(priorityFee)
        console.log(`Compute unit price: ${computeUnitPrice}`)

        // Build and send the transaction
        const transactionSignature = await transactionBuilder
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(4) }))
            .sendAndConfirm(umi)

        // Encode the transaction signature and generate explorer links
        const transactionSignatureBase58 = bs58.encode(transactionSignature.signature)
        const solanaTxLink = getExplorerLink('tx', transactionSignatureBase58.toString(), 'mainnet-beta')

        console.log(`✅ Minted ${taskArgs.amount} token(s) to: ${web3TokenAccount.address}!`)
        console.log(`View Solana transaction here: ${solanaTxLink}`)
    })
