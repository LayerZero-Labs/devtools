// Import necessary functions and classes from Solana SDKs
import fs from 'fs'

import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { generateSigner, signerIdentity, createSignerFromKeypair, TransactionBuilder, percentAmount } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, fromWeb3JsKeypair, fromWeb3JsInstruction, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { setAuthority, findAssociatedTokenPda, AuthorityType, mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { createAndMint, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

import { getKeypairFromEnvironment, getExplorerLink } from '@solana-developers/helpers';

import { OftTools, OFT_SEED } from '@layerzerolabs/lz-solana-sdk-v2'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'

import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { env } from 'process'

import getFee from '../utils/getFee'

task('lz:solana:oft:create:ena', 'Mints new SPL Token and creates new OFT Config account')
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

        const umi = createUmi(RPC_URL_SOLANA).use(mplToolbox());
        console.log(umi.programs.has('splAssociatedToken'));
        const walletKeyPair = getKeypairFromEnvironment('SOLANA_PRIVATE_KEY')
        const umiWalletKeyPair = fromWeb3JsKeypair(walletKeyPair);
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair);
        umi.use(signerIdentity(umiWalletSigner));

        // Your OFT_PROGRAM_ID
        const OFT_PROGRAM_ID = new PublicKey(taskArgs.program)
        // The TOKEN METADATA PROGRAM ID
        const umiWalletPublicKey = fromWeb3JsPublicKey(walletKeyPair.publicKey);
        // Generate SPL TOKEN Mint Keypair
        // Number of decimals for the token (recommended value is 6)
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

        // const tokenMint = await createMint(umi, {
        // mint,
        // decimals: LOCAL_DECIMALS,
        // mintAuthority: umiWalletPublicKey,
        // freezeAuthority: umiWalletPublicKey,
        // }).sendAndConfirm(umi)

        // const tokenTransactionSignature = bs58.encode(tokenMint.signature);
        // const tokenMintLink = getExplorerLink('tx', tokenTransactionSignature.toString(), 'mainnet-beta');
        // console.log(`✅ Token Mint Complete! View the transaction here: ${tokenMintLink}`)

        const token = generateSigner(umi)

        const tokenLegacyKeypair = toWeb3JsKeypair(token);

        // First, make sure the token creation was successful and you have the `token` object.
        const { averageFeeExcludingZeros } = await getFee()

        const priorityFee = Math.round(averageFeeExcludingZeros)

        const computeUnitPrice = BigInt(Math.round((priorityFee)))
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
        .sendAndConfirm(umi);

        const createTokenTransactionSignature = bs58.encode(createTokenTx.signature);
        const createTokenLink = getExplorerLink('tx', createTokenTransactionSignature.toString(), 'mainnet-beta');
        console.log(`✅ Token Mint Complete! View the transaction here: ${createTokenLink}`);

        // // Create the associated token account.
        // const tokenAccountTransaction = await createAssociatedToken(
        //     umi,
        //     {
        //         mint: token.publicKey,
        //         owner: umiWalletSigner.publicKey, // Use the public key of the wallet keypair as the owner
        //         payer: umiWalletSigner // Ensure the payer is the wallet signer
        //     }
        // ).sendAndConfirm(umi);

        // const tokenAccountSignature = bs58.encode(tokenAccountTransaction.signature);
        // const tokenAccountLink = getExplorerLink('tx', tokenAccountSignature.toString(), 'mainnet-beta');
        // console.log(`✅ Token Account created! View the transaction here: ${tokenAccountLink}`);

        const tokenAccount = await findAssociatedTokenPda(umi, {
            mint: token.publicKey,
            owner: umiWalletSigner.publicKey
        })

        console.log(`Your token account is: ${tokenAccount[0]}`);

        // // OPTIONAL: Mint initial supply of tokens BEFORE transferring mint authority (See below for after).
        // const oftMint = await mintTo(
        //     connection,
        //     walletKeyPair,
        //     mintKeyPair.publicKey,
        //     tokenAccount.address,
        //     walletKeyPair.publicKey,
        //     1000000000000,
        // );

        // Supply the Metadata using the token mint.
        // You can find the Token metadata uploaded to Arweave in ./utils/token.json

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

        // const setAuthorityTransactionSignature = bs58.encode(setAuthorityTx.signature);
        // const setAuthorityLink = getExplorerLink('tx', setAuthorityTransactionSignature.toString(), 'mainnet-beta');
        // console.log(`✅ Set authority complete! View the transaction here: ${setAuthorityLink}`);

        const oftConfigMintIx = await OftTools.createInitNativeOftIx(
            walletKeyPair.publicKey, // payer
            walletKeyPair.publicKey, // admin
            tokenLegacyKeypair.publicKey, // mint account
            walletKeyPair.publicKey, // OFT Mint Authority
            SHARED_DECIMALS, // OFT Shared Decimals
            TOKEN_PROGRAM_ID,
            OFT_PROGRAM_ID // OFT Program ID that I deployed
        );

        // Convert the instruction
        const convertedInstruction = fromWeb3JsInstruction(oftConfigMintIx);

        // Create the TransactionBuilder and add the WrappedInstruction
        const configBuilder = new TransactionBuilder([
            {
                instruction: convertedInstruction,
                signers: [umiWalletSigner],
                bytesCreatedOnChain: 0
            }
        ])

        // Set the fee payer and send the transaction
        const oftConfigTransaction = await setAuthorityTx
            .add(configBuilder)
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(4) }))
            .sendAndConfirm(umi);

        const oftConfigSignature = bs58.encode(oftConfigTransaction.signature);
        const oftConfigLink = getExplorerLink('tx', oftConfigSignature.toString(), 'mainnet-beta');
        console.log(`✅ You created a Native OFT, view the transaction here: ${oftConfigLink}`)

        // Function to convert a Keypair to AccountDetails
        const convertKeypairToAccountDetails = (publicKey: PublicKey, name: string): AccountDetails => {
            return {
                name: name,
                publicKey: publicKey.toString(),
            }
        }

        // Convert Keypair objects to AccountDetails
        const mintKeypairDetails = convertKeypairToAccountDetails(tokenLegacyKeypair.publicKey, 'SPL Token Mint Account')
        const oftConfigDetails = convertKeypairToAccountDetails(oftConfig, 'OFT Config Account')
        const oftProgramDetails = convertKeypairToAccountDetails(OFT_PROGRAM_ID, 'OFT Program ID')

        // Creating a JSON object
        const accountsJson: AccountsJson = {
            timestamp: new Date().toISOString(),
            accounts: [mintKeypairDetails, oftConfigDetails, oftProgramDetails],
        }

        // Defining the output directory and file name
        const outputDir = `./deployments/solana-${taskArgs.staging}`
        let outputFile
        outputFile = `${outputDir}/Mock.json`

        // Ensure the directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }

        // Write JSON object to file
        fs.writeFileSync(outputFile, JSON.stringify(accountsJson, null, 2))

        console.log(`Accounts have been saved to ${outputFile}`)

        // // 2a. OPTIONAL MINT WITH OFT
        // if (taskArgs.amount) {
        //     const oftMintTransaction = new Transaction().add(
        //         await OftTools.createMintToIx(
        //             walletKeyPair.publicKey,
        //             mintKeyPair.publicKey,
        //             new PublicKey(tokenAccount), // which account to mint to?
        //             BigInt(taskArgs.amount),
        //             TOKEN_PROGRAM_ID,
        //             OFT_PROGRAM_ID
        //         )
        //     )

        //     // Send the transaction to mint the OFT tokens
        //     const oftMintSignature = await sendAndConfirmTransaction(connection, oftMintTransaction, [walletKeyPair], {
        //         commitment: `finalized`,
        //     })
        //     const oftMintLink = getExplorerLink('tx', oftMintSignature, taskArgs.staging)
        //     console.log(`✅ You minted ${taskArgs.amount} tokens! View the transaction here: ${oftMintLink}`)
        // }
    })
