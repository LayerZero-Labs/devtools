import assert from 'assert'

import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'
import { findAssociatedTokenPda, mplToolbox, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox'
import { TransactionBuilder, createSignerFromKeypair, publicKey, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair, PublicKey } from '@solana/web3.js'
import { getExplorerLink } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { formatEid } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { OftPDA, oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { createSolanaConnectionFactory } from '../common/utils'

interface Args {
    amount: number
    to: string
    fromEid: EndpointId
    toEid: EndpointId
    programId: string
    mint: string
    escrow: string
}

const LOOKUP_TABLE_ADDRESS: Partial<Record<EndpointId, PublicKey>> = {
    [EndpointId.SOLANA_V2_MAINNET]: new PublicKey('AokBxha6VMLLgf97B5VYHEtqztamWmYERBmmFvjuTzJB'),
    [EndpointId.SOLANA_V2_TESTNET]: new PublicKey('9thqPdbR27A1yLWw2spwJLySemiGMXxPnEvfmXVk4KuK'),
}

// Define a Hardhat task for sending OFT from Solana
task('lz:oft:solana:send', 'Send tokens from Solana to a target EVM chain')
    .addParam('amount', 'The amount of tokens to send', undefined, types.int)
    .addParam('fromEid', 'The source endpoint ID', undefined, types.eid)
    .addParam('to', 'The recipient address on the destination chain')
    .addParam('toEid', 'The destination endpoint ID', undefined, types.eid)
    .addParam('mint', 'The OFT token mint public key', undefined, types.string)
    .addParam('programId', 'The OFT program ID', undefined, types.string)
    .addParam('escrow', 'The OFT escrow public key', undefined, types.string)
    .setAction(async (taskArgs: Args) => {
        const privateKey = process.env.SOLANA_PRIVATE_KEY
        assert(!!privateKey, 'SOLANA_PRIVATE_KEY is not defined in the environment variables.')

        const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))
        const umiKeypair = fromWeb3JsKeypair(keypair)

        const lookupTableAddress = LOOKUP_TABLE_ADDRESS[taskArgs.fromEid]
        assert(lookupTableAddress != null, `No lookup table found for ${formatEid(taskArgs.fromEid)}`)

        const connectionFactory = createSolanaConnectionFactory()
        const connection = await connectionFactory(taskArgs.fromEid)

        // Initialize Solana connection and UMI framework
        const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
        const umiWalletSigner = createSignerFromKeypair(umi, umiKeypair)
        umi.use(signerIdentity(umiWalletSigner))

        // Define OFT program and token mint public keys
        const oftProgramId = publicKey(taskArgs.programId)
        const umiMintPublicKey = publicKey(taskArgs.mint)
        const umiEscrowPublicKey = publicKey(taskArgs.escrow)

        // Find the associated token account
        const tokenAccount = findAssociatedTokenPda(umi, {
            mint: umiMintPublicKey,
            owner: umiWalletSigner.publicKey,
        })
        console.dir({ tokenAccount })

        // Derive the OFTStore PDA
        const oftPda = new OftPDA(oftProgramId)
        const [oftStorePda] = oftPda.oftStore(umiEscrowPublicKey)

        // Fetch token metadata
        // TODO fix
        umi.programs.bind('splToken', 'splToken2022')
        const mintInfo = (await fetchDigitalAsset(umi, umiMintPublicKey)).mint
        const amount = taskArgs.amount * 10 ** mintInfo.decimals
        const destinationEid: EndpointId = taskArgs.toEid

        // Derive peer address and fetch peer information
        const recipientAddressBytes32 = addressToBytes32(taskArgs.to)

        const accounts = {
            payer: umiWalletSigner,
            tokenMint: umiMintPublicKey,
            tokenEscrow: umiEscrowPublicKey,
            tokenSource: tokenAccount[0],
        }
        console.dir({
            oftConfigPda: oftStorePda,
            payer: umiWalletSigner.publicKey,
            tokenMint: umiMintPublicKey,
            tokenEscrow: umiEscrowPublicKey,
        })
        const { nativeFee } = await oft.quote(
            umi.rpc,
            {
                payer: umiWalletSigner.publicKey,
                tokenMint: umiMintPublicKey,
                tokenEscrow: umiEscrowPublicKey,
            },
            {
                payInLzToken: false,
                to: Buffer.from(recipientAddressBytes32),
                dstEid: destinationEid,
                amountLd: BigInt(amount),
                minAmountLd: 1n,
                options: Buffer.from(''),
                composeMsg: Buffer.from(''),
            },
            {
                oft: oftProgramId,
            }
        )
        console.dir({ nativeFee })

        const ix = await oft.send(
            umi.rpc,
            accounts,
            {
                to: Buffer.from(recipientAddressBytes32),
                dstEid: destinationEid,
                amountLd: BigInt(amount),
                minAmountLd: (BigInt(amount) * BigInt(9)) / BigInt(10),
                options: Buffer.from(''),
                composeMsg: Buffer.from(''),
                nativeFee,
            },
            {
                oft: oftProgramId,
            }
        )

        const tx = new TransactionBuilder([ix])
        // TODO fix
        const transactionSignature = await tx
            // .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(4) }))
            .add(setComputeUnitLimit(umi, { units: 500000 }))
            // .setAddressLookupTables([addressLookupTableInput])
            .sendAndConfirm(umi)
        //
        // // Encode the transaction signature and generate explorer links
        const transactionSignatureBase58 = bs58.encode(transactionSignature.signature)
        const solanaTxLink = getExplorerLink('tx', transactionSignatureBase58.toString(), 'mainnet-beta') // TODO fix
        const layerZeroTxLink = `https://layerzeroscan.com/tx/${transactionSignatureBase58}`

        console.log(`✅ Sent ${taskArgs.amount} token(s) to destination EID: ${destinationEid}!`)
        console.log(`View Solana transaction here: ${solanaTxLink}`)
        console.log(`Track cross-chain transfer here: ${layerZeroTxLink}`)
    })
