// Import necessary modules and classes from Solana SDKs and other libraries
import assert from 'assert'

import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'
import { mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, fromWeb3JsKeypair, fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { Keypair, PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import { createSolanaConnectionFactory } from '../common/utils'
import getFee from '../utils/getFee'

interface Args {
    amount: number
    mint: PublicKey
    to: PublicKey
    eid: EndpointId
    programId: string
}

// Define a Hardhat task for minting tokens on Solana using the OFT pass-through
task('lz:oft:solana:mint', 'Mint tokens on Solana using OFT pass-through')
    .addParam('amount', 'The amount of tokens to send')
    .addParam('mint', 'The OFT token mint public key')
    .addParam('to', 'The recipient address on Solana')
    .addParam('eid', 'The source endpoint ID')
    .addParam('programId', 'The OFT program ID')
    .setAction(async (taskArgs: Args) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')

        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))
        const umiKeypair = fromWeb3JsKeypair(keypair)

        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.eid)

        // Initialize Solana connection and UMI framework
        const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
        const umiWalletSigner = createSignerFromKeypair(umi, umiKeypair)
        umi.use(signerIdentity(umiWalletSigner))

        // Define OFT program and token mint public keys
        const oftProgramId = new PublicKey(taskArgs.programId)
        const mintPublicKey = new PublicKey(taskArgs.mint)
        const toPublicKey = new PublicKey(taskArgs.to)
        const umiMintPublicKey = fromWeb3JsPublicKey(mintPublicKey)

        const web3TokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mintPublicKey,
            toPublicKey,
            undefined,
            'finalized'
        )

        // Fetch token metadata
        const mintInfo = (await fetchDigitalAsset(umi, umiMintPublicKey)).mint
        const amount = taskArgs.amount * 10 ** mintInfo.decimals

        const oftMintIx = await OftTools.createMintToIx(
            TOKEN_PROGRAM_ID,
            keypair.publicKey,
            mintPublicKey,
            web3TokenAccount.address, // which account to mint to?
            BigInt(amount),
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
        const { averageFeeExcludingZeros } = await getFee(connection)
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
