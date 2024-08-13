import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
import { mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey, clusterApiUrl } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import getFee from '../utils/getFee'

task('lz:oft:solana:set-mint-authority', 'Sets solana mint authority to new account')
    .addParam('newAuthority', 'The solana address to transfer authority to')
    .addParam('mint', 'The OFT token mint public key')
    .addParam('program', 'The OFT Program id')
    .setAction(async (taskArgs: TaskArguments) => {
        if (!env.SOLANA_PRIVATE_KEY) {
            throw new Error('SOLANA_PRIVATE_KEY is not defined in the environment variables.')
        }
        // Set up Solana connection and UMI framework
        const rpcUrlSolana: string = env.RPC_URL_SOLANA?.toString() ?? clusterApiUrl('mainnet-beta')
        const umi = createUmi(rpcUrlSolana).use(mplToolbox())

        // Decode private key and create keypair for signing
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY))
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        const mintPublicKey = new PublicKey(taskArgs.mint)
        const newAuthorityPublicKey = new PublicKey(taskArgs.newAuthority)
        const oftProgramId = new PublicKey(taskArgs.program)

        // Derive the oftConfig
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), mintPublicKey.toBuffer()],
            oftProgramId
        )

        // Create the instruction using OftTools
        const setMintAuthorityIx = await OftTools.createSetMintAuthorityIx(
            web3WalletKeyPair.publicKey,
            oftConfig,
            newAuthorityPublicKey,
            oftProgramId
        )

        // Convert the instruction and create the transaction builder
        const convertedInstruction = fromWeb3JsInstruction(setMintAuthorityIx)
        const transactionBuilder = new TransactionBuilder([
            {
                instruction: convertedInstruction,
                signers: [umiWalletSigner],
                bytesCreatedOnChain: 0,
            },
        ])

        // Fetch simulation compute unit price
        const { averageFeeExcludingZeros } = await getFee()
        const avgComputeUnitPrice = Math.round(averageFeeExcludingZeros)
        const computeUnitPrice = BigInt(avgComputeUnitPrice * 1.1)

        // Send and confirm the transaction
        const transactionSignature = await transactionBuilder
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice }))
            .sendAndConfirm(umi)
        const setOFTAuthoritySignature = bs58.encode(transactionSignature.signature)
        const setOFTAuthorityLink = getExplorerLink('tx', setOFTAuthoritySignature.toString(), 'mainnet-beta')
        console.log(
            `✅ You set ${newAuthorityPublicKey} as the mint authority of your OFT Config Account: ${oftConfig}, see transaction here: ${setOFTAuthorityLink}`
        )
    })
