// Import necessary functions and classes from Solana SDKs
import assert from 'assert'
import fs from 'fs'

import { TokenStandard, createAndMint } from '@metaplex-foundation/mpl-token-metadata'
import {
    AuthorityType,
    findAssociatedTokenPda,
    mplToolbox,
    setAuthority,
    setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox'
import {
    TransactionBuilder,
    createSignerFromKeypair,
    generateSigner,
    percentAmount,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, fromWeb3JsPublicKey, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import { createSolanaConnectionFactory } from '../common/utils'
import getFee from '../utils/getFee'

interface Args {
    amount: number
    eid: EndpointId
    programId: string
}

task('lz:oft:solana:create', 'Mints new SPL Token and creates new OFT Config account')
    .addParam('programId', 'The OFT Program id')
    .addParam('eid', 'Solana mainnet or testnet', undefined, types.eid)
    .addOptionalParam('amount', 'The initial supply to mint on solana', undefined, types.int)
    .setAction(async (taskArgs: Args) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')

        // 1. Setup UMI environment using environment variables (private key and Solana RPC)

        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.eid)

        // Initialize UMI with the Solana RPC URL and necessary tools
        const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())

        // Generate a wallet keypair from the private key stored in the environment
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))

        // Convert the UMI keypair to a format compatible with web3.js
        // This is necessary as the @layerzerolabs/lz-solana-sdk-v2 library uses web3.js keypairs
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)

        // Create a signer object for UMI to use in transactions
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)

        // Set the UMI environment to use the signer identity
        umi.use(signerIdentity(umiWalletSigner))

        // Define the OFT Program ID based on the task arguments
        const OFT_PROGRAM_ID = new PublicKey(taskArgs.programId)

        // Number of decimals for the token (recommended value for SHARED_DECIMALS is 6)
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

        // 2. Generate the accounts we want to create (SPL Token)

        // Generate a new keypair for the SPL token mint account
        const token = generateSigner(umi)

        // Convert the UMI keypair to web3.js compatible keypair
        const web3TokenKeyPair = toWeb3JsKeypair(token)

        // Get the average compute unit price
        // getFee() uses connection.getRecentPrioritizationFees() to get recent fees and averages them
        const { averageFeeExcludingZeros } = await getFee(connection)
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
        const createTokenTransactionSignature = bs58.encode(createTokenTx.signature)
        const createTokenLink = getExplorerLink('tx', createTokenTransactionSignature.toString(), 'mainnet-beta')
        console.log(`✅ Token Mint Complete! View the transaction here: ${createTokenLink}`)

        // Find the associated token account using the generated token mint
        const tokenAccount = findAssociatedTokenPda(umi, {
            mint: token.publicKey,
            owner: umiWalletSigner.publicKey,
        })

        console.log(`Your token account is: ${tokenAccount[0]}`)

        // 3. Derive OFT Config from those accounts and program ID

        // Derive the OFT Config public key from the token mint keypair and OFT Program ID
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), web3TokenKeyPair.publicKey.toBuffer()],
            OFT_PROGRAM_ID
        )

        console.log(`OFT Config:`, oftConfig)

        // 4. Create new account (OFT Config)

        // Create a new transaction to transfer mint authority to the OFT Config account and initialize a new native OFT
        const setAuthorityTx = setAuthority(umi, {
            owned: token.publicKey, // SPL Token mint account
            owner: umiWalletKeyPair.publicKey, // Current authority of the token mint
            authorityType: AuthorityType.MintTokens, // Authority type to transfer
            newAuthority: fromWeb3JsPublicKey(oftConfig), // New authority (OFT Config)
        })

        // Initialize the OFT using the OFT Config and the token mint
        const oftConfigMintIx = await OftTools.createInitNativeOftIx(
            OFT_PROGRAM_ID, // OFT Program ID
            web3WalletKeyPair.publicKey, // Payer
            web3WalletKeyPair.publicKey, // Admin
            web3TokenKeyPair.publicKey, // Mint account
            web3WalletKeyPair.publicKey, // OFT Mint Authority
            SHARED_DECIMALS // OFT Shared Decimals
        )

        // Convert the instruction to UMI format
        const convertedInstruction = fromWeb3JsInstruction(oftConfigMintIx)

        // Build the transaction with the OFT Config initialization instruction
        const configBuilder = new TransactionBuilder([
            {
                instruction: convertedInstruction,
                signers: [umiWalletSigner],
                bytesCreatedOnChain: 0,
            },
        ])

        // Set the fee payer and send the transaction
        const oftConfigTransaction = await setAuthorityTx
            .add(configBuilder)
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(4) }))
            .sendAndConfirm(umi)

        // Log the transaction details
        const oftConfigSignature = bs58.encode(oftConfigTransaction.signature)
        const oftConfigLink = getExplorerLink('tx', oftConfigSignature.toString(), 'mainnet-beta')
        console.log(`✅ You created an OFT, view the transaction here: ${oftConfigLink}`)

        // Save the account details to a JSON file
        const accountsJson: AccountsJson = {
            timestamp: new Date().toISOString(),
            accounts: [
                { name: 'SPL Token Mint Account', publicKey: web3TokenKeyPair.publicKey.toString() },
                { name: 'OFT Config Account', publicKey: oftConfig.toString() },
                { name: 'OFT Program ID', publicKey: taskArgs.programId },
            ],
        }

        const outputDir = `./deployments/${endpointIdToNetwork(taskArgs.eid)}`
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        // Write the JSON file to the specified directory
        fs.writeFileSync(`${outputDir}/OFT.json`, JSON.stringify(accountsJson, null, 2))
        console.log(`Accounts have been saved to ${outputDir}/OFT.json`)
    })
