// Import necessary functions and classes from Solana SDKs
import fs from 'fs'
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { TokenStandard, createAndMint } from '@metaplex-foundation/mpl-token-metadata'
import { findAssociatedTokenPda, mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import {
    TransactionBuilder,
    createSignerFromKeypair,
    generateSigner,
    percentAmount,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, clusterApiUrl } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import getFee from '../utils/getFee'

task('lz:oft-adapter:solana:create', 'Mints new SPL Token, Lockbox, and new OFT Adapter Config account')
    .addParam('program', 'The OFT Program id')
    .addParam('staging', 'Solana mainnet or testnet')
    .addOptionalParam('amount', 'The initial supply to mint on solana')
    .setAction(async (taskArgs: TaskArguments) => {
        if (!env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }
        const privateKey = env.SOLANA_PRIVATE_KEY
        // 1. Setup UMI environment using environment variables (private key and Solana RPC)

        // Determine RPC URL based on network staging (mainnet or testnet)
        const RPC_URL_SOLANA =
            taskArgs.staging === 'mainnet'
                ? env.RPC_URL_SOLANA?.toString() ?? clusterApiUrl('mainnet-beta')
                : env.RPC_URL_SOLANA_TESTNET?.toString() ?? clusterApiUrl('devnet')

        // Initialize UMI with the Solana RPC URL and necessary tools
        const umi = createUmi(RPC_URL_SOLANA).use(mplToolbox())

        // Generate a wallet keypair from the private key stored in environment
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))

        // Convert the UMI keypair to a format compatible with web3.js
        // This is necessary as the @layerzerolabs/lz-solana-sdk-v2 library uses web3.js keypairs
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)

        // Create a signer object for UMI to use in transactions
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)

        // Set the UMI environment to use the signer identity
        umi.use(signerIdentity(umiWalletSigner))

        // Define the OFT Program ID based on the task arguments
        const OFT_PROGRAM_ID = new PublicKey(taskArgs.program)

        // Define the number of decimals for the token
        const LOCAL_DECIMALS = 9

        // Define the number of shared decimals for the token
        // The OFT Standard handles differences in decimal precision before every cross-chain
        // by "cleaning" the dust off of the amount to send by dividing by a `decimalConversionRate`.
        // For example, when you send a value of 123456789012345678 (18 decimals):
        //
        // decimalConversionRate = 10^(localDecimals − sharedDecimals) = 10^(18−6) = 10^12
        // 123456789012345678 / 10^12 = 123456.789012345678 = 123456
        // amount = 123456 * 10^12 = 12345600000000000
        //
        // For more information, see the OFT Standard documentation:
        // https://docs.layerzero.network/v2/developers/solana/oft/native#token-transfer-precision
        const SHARED_DECIMALS = 6

        // Interface to hold account details for saving later
        interface AccountDetails {
            name: string
            publicKey: string
        }

        // Interface for the JSON structure that will store account information
        interface AccountsJson {
            timestamp: string
            accounts: AccountDetails[]
        }

        // 2. Generate the accounts we want to create (SPL Token / Lockbox)

        // Generate a new keypair for the SPL token mint account
        const token = generateSigner(umi)

        // Generate a new keypair for the Lockbox account
        const lockbox = generateSigner(umi)

        // Convert the UMI keypairs to web3.js compatible keypairs
        const web3TokenKeyPair = toWeb3JsKeypair(token)
        const web3LockboxKeypair = toWeb3JsKeypair(lockbox)

        // Get the average compute unit price
        // getFee() uses connection.getRecentPrioritizationFees() to get recent fees and averages them
        // This is necessary as Solana's default compute unit price is not always sufficient to land the tx
        const { averageFeeExcludingZeros } = await getFee()
        const computeUnitPrice = BigInt(Math.round(averageFeeExcludingZeros))

        // Create and mint the SPL token using UMI
        const createTokenTx = await createAndMint(umi, {
            mint: token, // New token account
            name: 'Mock', // Token name
            symbol: 'Mock', // Token symbol
            isMutable: true, // Allow token metadata to be mutable
            decimals: LOCAL_DECIMALS, // Number of decimals for the token
            uri: '', // URI for token metadata
            sellerFeeBasisPoints: percentAmount(0), // Fee percentage
            authority: umiWalletSigner, // Authority for the token mint
            amount: taskArgs.amount, // Initial amount to mint
            tokenOwner: umiWalletSigner.publicKey, // Owner of the token
            tokenStandard: TokenStandard.Fungible, // Token type (Fungible)
        })
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(2) }))
            .sendAndConfirm(umi)

        // Log the transaction and token mint details
        console.log(
            `✅ Token Mint Complete! View the transaction here: ${getExplorerLink('tx', bs58.encode(createTokenTx.signature), taskArgs.staging)}`
        )

        // Find the associated token account using the generated token mint
        const tokenAccount = findAssociatedTokenPda(umi, {
            mint: token.publicKey,
            owner: umiWalletSigner.publicKey,
        })

        console.log(`Your token account is: ${tokenAccount[0]}`)

        // 3. Derive OFT Config from those accounts and program ID

        // Derive the OFT Config public key from the Lockbox keypair and OFT Program ID
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), web3LockboxKeypair.publicKey.toBuffer()],
            OFT_PROGRAM_ID
        )

        console.log(`OFT Config:`, oftConfig)

        // 4. Create new account (OFT Adapter Config)

        // Create the OFT Adapter Config initialization instruction
        const adapterIx = await OftTools.createInitAdapterOftIx(
            web3WalletKeyPair.publicKey, // Payer
            web3WalletKeyPair.publicKey, // Admin
            web3TokenKeyPair.publicKey, // SPL Token Mint Account
            web3LockboxKeypair.publicKey, // Lockbox account
            SHARED_DECIMALS, // Number of shared decimals
            TOKEN_PROGRAM_ID, // Token program ID
            OFT_PROGRAM_ID // OFT Program ID
        )

        // Build and send the transaction with the create OFT Adapter instruction
        const oftConfigTransaction = await new TransactionBuilder([
            {
                instruction: fromWeb3JsInstruction(adapterIx),
                signers: [umiWalletSigner],
                bytesCreatedOnChain: 0,
            },
        ])
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(4) }))
            .sendAndConfirm(umi)

        // Log the transaction details
        console.log(
            `✅ You created an OFT Adapter, view the transaction here: ${getExplorerLink('tx', bs58.encode(oftConfigTransaction.signature), taskArgs.staging)}`
        )

        // Save the account details to a JSON file
        const accountsJson: AccountsJson = {
            timestamp: new Date().toISOString(),
            accounts: [
                { name: 'SPL Token Mint Account', publicKey: web3TokenKeyPair.publicKey.toString() },
                { name: 'OFT Config Account', publicKey: oftConfig.toString() },
                { name: 'OFT Program ID', publicKey: taskArgs.program },
                { name: 'OFT Lockbox', publicKey: web3LockboxKeypair.publicKey.toString() },
            ],
        }

        const outputDir = `./deployments/solana-${taskArgs.staging}`
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        // Write the JSON file to the specified directory
        fs.writeFileSync(`${outputDir}/OFTAdapter.json`, JSON.stringify(accountsJson, null, 2))
        console.log(`Accounts have been saved to ${outputDir}/OFTAdapter.json`)
    })
