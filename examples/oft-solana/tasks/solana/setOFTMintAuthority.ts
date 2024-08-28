import assert from 'assert'

import { mplToolbox, setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsInstruction, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_SEED, OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import { createSolanaConnectionFactory } from '../common/utils'
import getFee from '../utils/getFee'

interface Args {
    newAuthority: PublicKey
    mint: PublicKey
    programId: string
    eid: EndpointId
}

task('lz:oft:solana:set-mint-authority', 'Sets solana mint authority to new account')
    .addParam('newAuthority', 'The solana address to transfer authority to')
    .addParam('mint', 'The OFT token mint public key')
    .addParam('programId', 'The OFT program ID', undefined, types.string)
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
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        const mintPublicKey = new PublicKey(taskArgs.mint)
        const newAuthorityPublicKey = new PublicKey(taskArgs.newAuthority)
        const oftProgramId = new PublicKey(taskArgs.programId)

        // Derive the oftConfig
        const [oftConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), mintPublicKey.toBuffer()],
            oftProgramId
        )

        // Create the instruction using OftTools
        const setMintAuthorityIx = await OftTools.createSetMintAuthorityIx(
            oftProgramId,
            web3WalletKeyPair.publicKey,
            oftConfig,
            newAuthorityPublicKey
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
        const { averageFeeExcludingZeros } = await getFee(connection)
        const avgComputeUnitPrice = Math.round(averageFeeExcludingZeros)
        const computeUnitPrice = BigInt(avgComputeUnitPrice * 2)

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
