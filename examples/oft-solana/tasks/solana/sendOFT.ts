// Import necessary modules and classes from Solana SDKs and other libraries
import { env } from 'process'

import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'
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
    fromWeb3JsPublicKey,
    toWeb3JsKeypair,
    toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { getExplorerLink, getSimulationComputeUnits } from '@solana-developers/helpers'
import { hexlify } from 'ethers/lib/utils'
import { task } from 'hardhat/config'
import { TaskArguments } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OFT_SEED, OftPDADeriver, OftProgram, OftTools, SendHelper } from '@layerzerolabs/lz-solana-sdk-v2'
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import getFee from '../utils/getFee'

// Define a Hardhat task for sending OFT from Solana
task('lz:oft:solana:send', 'Send tokens from Solana to a target EVM chain')
    .addParam('amount', 'The amount of tokens to send')
    .addParam('to', 'The recipient address on the destination chain')
    .addParam('eid', 'The destination endpoint ID')
    .addParam('mint', 'The OFT token mint public key')
    .addParam('program', 'The OFT program ID')
    .addParam('staging', 'Solana mainnet or testnet environment')
    .setAction(async (taskArgs: TaskArguments) => {
        let rpcUrlSolana: string
        let lookupTableAddress: PublicKey

        // Determine RPC URL and lookup table address based on the specified environment
        if (taskArgs.staging === 'mainnet') {
            rpcUrlSolana = env.RPC_URL_SOLANA?.toString() ?? 'default_url'
            lookupTableAddress = new PublicKey('AokBxha6VMLLgf97B5VYHEtqztamWmYERBmmFvjuTzJB')
        } else if (taskArgs.staging === 'testnet') {
            rpcUrlSolana = env.RPC_URL_SOLANA_TESTNET?.toString() ?? 'default_url'
            lookupTableAddress = new PublicKey('8VnbKsKuy7ibcXamMJSzPXNRFkv7wJUUdQmosgvxExGk')
        } else {
            throw new Error("Invalid network specified. Use 'mainnet' or 'testnet'.")
        }

        // Initialize Solana connection and UMI framework
        const connection = new Connection(rpcUrlSolana)
        const umi = createUmi(rpcUrlSolana).use(mplToolbox())
        const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(env.SOLANA_PRIVATE_KEY!))
        const web3WalletKeyPair = toWeb3JsKeypair(umiWalletKeyPair)
        const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
        umi.use(signerIdentity(umiWalletSigner))

        // Define OFT program and token mint public keys
        const oftProgramId = new PublicKey(taskArgs.program)
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
        const destinationEid: EndpointId = taskArgs.eid
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
            web3WalletKeyPair.publicKey,
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
                web3WalletKeyPair.publicKey,
                oftConfigPda,
                destinationEid,
                hexlify(peerInfo.address)
            ),
            TOKEN_PROGRAM_ID, // SPL Token Program
            oftProgramId // OFT Program
        )

        console.log(feeQuote)

        // Create the instruction for sending tokens
        const sendInstruction = await OftTools.sendWithUln(
            connection,
            web3WalletKeyPair.publicKey, // payer
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
            TOKEN_PROGRAM_ID, // SPL Token Program
            oftProgramId // OFT Program
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
        const { averageFeeExcludingZeros } = await getFee()
        const priorityFee = Math.round(averageFeeExcludingZeros)
        const computeUnitPrice = BigInt(priorityFee)
        console.log(`Compute unit price: ${computeUnitPrice}`)

        const addressLookupTableInput: AddressLookupTableInput = await fetchAddressLookupTable(
            umi,
            fromWeb3JsPublicKey(lookupTableAddress)
        )
        const { value: lookupTableAccount } = await connection.getAddressLookupTable(new PublicKey(lookupTableAddress))
        const computeUnits = await getSimulationComputeUnits(
            connection,
            [sendInstruction],
            web3WalletKeyPair.publicKey,
            [lookupTableAccount!]
        )

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
