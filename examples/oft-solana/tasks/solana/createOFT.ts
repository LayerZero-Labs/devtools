// Import necessary functions and classes from Solana SDKs
import fs from 'fs'
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
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
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import getFee from '../utils/getFee'

task('lz:solana:oft:create', 'Mints new SPL Token and creates new OFT Config account')
    .addParam('program', 'The OFT Program id')
    .addParam('staging', 'Solana mainnet or testnet')
    .addOptionalParam('amount', 'The initial supply to mint on solana')
    .setAction(async (taskArgs: TaskArguments) => {
        let RPC_URL_SOLANA: string
        // Connect to the Solana cluster (devnet in this case)
        if (taskArgs.staging == 'mainnet') {
            RPC_URL_SOLANA = env.RPC_URL_SOLANA?.toString() ?? 'default_url'
        } else if (taskArgs.staging == 'testnet') {
            RPC_URL_SOLANA = env.RPC_URL_SOLANA_TESTNET?.toString() ?? 'default_url'
        } else {
            throw new Error("Invalid network specified. Use 'mainnet' or 'testnet'.")
        }

        const umi = createUmi(RPC_URL_SOLANA).use(mplToolbox())
        console.log(umi.programs.has('splAssociatedToken'))
        console.log(process.env.SOLANA_PRIVATE_KEY)
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY!))
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        // Your OFT_PROGRAM_ID
        const OFT_PROGRAM_ID = new PublicKey(taskArgs.program)

        // Number of decimals for the token (recommended value for SHARED_DECIMALS is 6)
        const LOCAL_DECIMALS = 9
        const SHARED_DECIMALS = 6

        interface AccountDetails {
            name: string
            publicKey: string
        }

        interface AccountsJson {
            timestamp: string
            accounts: AccountDetails[]
        }

        //
        // 1. MINT NEW SPL TOKEN
        //

        const token = generateSigner(umi)

        const tokenLegacyKeypair = toWeb3JsKeypair(token)

        // First, make sure the token creation was successful and you have the `token` object.
        const { averageFeeExcludingZeros } = await getFee()

        const priorityFee = Math.round(averageFeeExcludingZeros)

        const computeUnitPrice = BigInt(Math.round(priorityFee))
        console.log(computeUnitPrice)

        const createTokenTx = await createAndMint(umi, {
            mint: token,
            name: 'Mock',
            symbol: 'Mock',
            isMutable: true,
            decimals: LOCAL_DECIMALS,
            uri: '',
            sellerFeeBasisPoints: percentAmount(0),
            authority: umiWalletSigner,
            amount: taskArgs.amount,
            tokenOwner: umiWalletSigner.publicKey,
            tokenStandard: TokenStandard.Fungible,
        })
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(2) }))
            .sendAndConfirm(umi)

        const createTokenTransactionSignature = bs58.encode(createTokenTx.signature)
        const createTokenLink = getExplorerLink('tx', createTokenTransactionSignature.toString(), 'mainnet-beta')
        console.log(`✅ Token Mint Complete! View the transaction here: ${createTokenLink}`)

        const tokenAccount = await findAssociatedTokenPda(umi, {
            mint: token.publicKey,
            owner: umiWalletSigner.publicKey,
        })

        console.log(`Your token account is: ${tokenAccount[0]}`)

        // Derive the OFT Config's PDA
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), tokenLegacyKeypair.publicKey.toBuffer()],
            OFT_PROGRAM_ID
        )
        console.log(`OFT Config:`, oftConfig)

        //
        // 2. Create a new tx to transfer mint authority to OFT Config Account and initialize a new native OFT
        //

        const setAuthorityTx = await setAuthority(umi, {
            owned: token.publicKey,
            owner: umiWalletKeyPair.publicKey,
            authorityType: AuthorityType.MintTokens,
            newAuthority: fromWeb3JsPublicKey(oftConfig),
        })

        const oftConfigMintIx = await OftTools.createInitNativeOftIx(
            web3WalletKeyPair.publicKey, // payer
            web3WalletKeyPair.publicKey, // admin
            tokenLegacyKeypair.publicKey, // mint account
            web3WalletKeyPair.publicKey, // OFT Mint Authority
            SHARED_DECIMALS, // OFT Shared Decimals
            TOKEN_PROGRAM_ID,
            OFT_PROGRAM_ID // OFT Program ID that I deployed
        )

        // Convert the instruction
        const convertedInstruction = fromWeb3JsInstruction(oftConfigMintIx)

        // Create the TransactionBuilder and add the WrappedInstruction
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

        const oftConfigSignature = bs58.encode(oftConfigTransaction.signature)
        const oftConfigLink = getExplorerLink('tx', oftConfigSignature.toString(), 'mainnet-beta')
        console.log(`✅ You created a Native OFT, view the transaction here: ${oftConfigLink}`)

        // Function to convert a Keypair to AccountDetails
        const convertKeypairToAccountDetails = (publicKey: PublicKey, name: string): AccountDetails => {
            return {
                name: name,
                publicKey: publicKey.toString(),
            }
        }

        // Convert Keypair objects to AccountDetails
        const mintKeypairDetails = convertKeypairToAccountDetails(
            tokenLegacyKeypair.publicKey,
            'SPL Token Mint Account'
        )
        const oftConfigDetails = convertKeypairToAccountDetails(oftConfig, 'OFT Config Account')
        const oftProgramDetails = convertKeypairToAccountDetails(OFT_PROGRAM_ID, 'OFT Program ID')

        // Creating a JSON object
        const accountsJson: AccountsJson = {
            timestamp: new Date().toISOString(),
            accounts: [mintKeypairDetails, oftConfigDetails, oftProgramDetails],
        }

        // Defining the output directory and file name
        const outputDir = `./deployments/solana-${taskArgs.staging}`
        const outputFile = `${outputDir}/Mock.json`

        // Ensure the directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        // Write JSON object to file
        fs.writeFileSync(outputFile, JSON.stringify(accountsJson, null, 2))

        console.log(`Accounts have been saved to ${outputFile}`)
    })
