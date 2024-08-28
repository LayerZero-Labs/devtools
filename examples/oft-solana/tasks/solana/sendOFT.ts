import assert from 'assert'

import { fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'
import {
    fetchAddressLookupTable,
    findAssociatedTokenPda,
    mplToolbox,
    setComputeUnitLimit,
    setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox'
import {
    AddressLookupTableInput,
    TransactionBuilder,
    createSignerFromKeypair,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
    fromWeb3JsInstruction,
    fromWeb3JsKeypair,
    fromWeb3JsPublicKey,
    toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Keypair, PublicKey } from '@solana/web3.js'
import { getExplorerLink, getSimulationComputeUnits } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { hexlify } from 'ethers/lib/utils'
import { task } from 'hardhat/config'

import { formatEid } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_SEED, OftPDADeriver, OftProgram, OftTools, SendHelper } from '@layerzerolabs/lz-solana-sdk-v2'
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { createSolanaConnectionFactory } from '../common/utils'
import getFee from '../utils/getFee'

interface Args {
    amount: number
    to: string
    fromEid: EndpointId
    toEid: EndpointId
    programId: string
    mint: string
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
        const oftProgramId = new PublicKey(taskArgs.programId)
        const mintPublicKey = new PublicKey(taskArgs.mint)
        const umiMintPublicKey = fromWeb3JsPublicKey(mintPublicKey)

        // Find the associated token account
        const tokenAccount = findAssociatedTokenPda(umi, {
            mint: umiMintPublicKey,
            owner: umiWalletSigner.publicKey,
        })

        // Derive the OFT configuration PDA
        const [oftConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED), mintPublicKey.toBuffer()],
            oftProgramId
        )

        // Fetch token metadata
        const mintInfo = (await fetchDigitalAsset(umi, umiMintPublicKey)).mint
        const destinationEid: EndpointId = taskArgs.toEid
        const amount = taskArgs.amount * 10 ** mintInfo.decimals

        // Derive peer address and fetch peer information
        const deriver = new OftPDADeriver(oftProgramId)
        const [peerAddress] = deriver.peer(oftConfigPda, destinationEid)
        const peerInfo = await OftProgram.accounts.Peer.fromAccountAddress(connection, peerAddress)

        // Set up send helper and convert recipient address to bytes32
        const sendHelper = new SendHelper()
        const recipientAddressBytes32 = addressToBytes32(taskArgs.to)

        // Quote the fee for the cross-chain transfer
        const feeQuote = await OftTools.quoteWithUln(
            connection,
            oftProgramId, // OFT Program
            keypair.publicKey,
            mintPublicKey,
            destinationEid,
            BigInt(amount),
            (BigInt(amount) * BigInt(9)) / BigInt(10),
            Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes(),
            Array.from(recipientAddressBytes32),
            false, // payInZRO
            undefined, // tokenEscrow
            undefined, // composeMsg
            peerInfo.address,
            await sendHelper.getQuoteAccounts(
                connection,
                keypair.publicKey,
                oftConfigPda,
                destinationEid,
                hexlify(peerInfo.address)
            ),
            undefined, // Endpoint program ID
            TOKEN_PROGRAM_ID // SPL Token Program
        )

        console.log(feeQuote)

        // Create the instruction for sending tokens
        const sendInstruction = await OftTools.sendWithUln(
            connection,
            oftProgramId, // OFT Program
            keypair.publicKey, // payer
            mintPublicKey, // tokenMint
            toWeb3JsPublicKey(tokenAccount[0]), // tokenSource
            destinationEid,
            BigInt(amount),
            (BigInt(amount) * BigInt(9)) / BigInt(10),
            Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes(),
            Array.from(recipientAddressBytes32),
            feeQuote.nativeFee,
            undefined, // payInZRO
            undefined,
            undefined,
            peerInfo.address,
            undefined,
            undefined, // Endpoint program ID
            TOKEN_PROGRAM_ID // SPL Token Program
        )

        // Convert the instruction and create the transaction builder
        const convertedInstruction = fromWeb3JsInstruction(sendInstruction)
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

        const addressLookupTableInput: AddressLookupTableInput = await fetchAddressLookupTable(
            umi,
            fromWeb3JsPublicKey(lookupTableAddress)
        )
        const { value: lookupTableAccount } = await connection.getAddressLookupTable(new PublicKey(lookupTableAddress))
        const computeUnits = await getSimulationComputeUnits(connection, [sendInstruction], keypair.publicKey, [
            lookupTableAccount!,
        ])

        // Build and send the transaction
        const transactionSignature = await transactionBuilder
            .add(setComputeUnitPrice(umi, { microLamports: computeUnitPrice * BigInt(4) }))
            .add(setComputeUnitLimit(umi, { units: computeUnits! * 1.1 }))
            .setAddressLookupTables([addressLookupTableInput])
            .sendAndConfirm(umi)

        // Encode the transaction signature and generate explorer links
        const transactionSignatureBase58 = bs58.encode(transactionSignature.signature)
        const solanaTxLink = getExplorerLink('tx', transactionSignatureBase58.toString(), 'mainnet-beta')
        const layerZeroTxLink = `https://layerzeroscan.com/tx/${transactionSignatureBase58}`

        console.log(`✅ Sent ${taskArgs.amount} token(s) to destination EID: ${destinationEid}!`)
        console.log(`View Solana transaction here: ${solanaTxLink}`)
        console.log(`Track cross-chain transfer here: ${layerZeroTxLink}`)
    })
