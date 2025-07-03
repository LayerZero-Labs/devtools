/**
 * @file aptos-move-send.ts
 * @description A script to demonstrate cross-chain messaging using LayerZero's OApp protocol.
 * This script sends a message from an Aptos chain to another blockchain (e.g., BSC testnet).
 * It handles the entire flow of:
 * 1. Message preparation and fee quotation
 * 2. Balance verification
 * 3. Transaction building and submission
 * 4. Transaction confirmation
 */

import {
    Account,
    AccountAddressInput,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    InputEntryFunctionData,
    Network,
    PrivateKey,
    PrivateKeyVariants,
    SimpleTransaction,
} from '@aptos-labs/ts-sdk'
import * as dotenv from 'dotenv'

import { Chain, EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

// Load environment variables from .env file
dotenv.config()

// Validate required environment variables
if (!process.env.APTOS_PRIVATE_KEY || !process.env.APTOS_ACCOUNT_ADDRESS) {
    throw new Error('Please set APTOS_PRIVATE_KEY and APTOS_ACCOUNT_ADDRESS in your .env file')
}

// Configuration constants
const APTOS_PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY
const ACCOUNT_ADDRESS = process.env.APTOS_ACCOUNT_ADDRESS

// OApp configuration
const OAPP_ADDRESS = '' // Set your OApp's address on Aptos
const REMOTE_EID = EndpointId.BSC_V2_TESTNET // Destination chain endpoint ID
const NETWORK = Network.TESTNET // Aptos network configuration

// Initialize Aptos account and client
const privateKey = PrivateKey.formatPrivateKey(APTOS_PRIVATE_KEY, PrivateKeyVariants.Ed25519)
const signerAccount = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey),
    address: ACCOUNT_ADDRESS,
})
const aptos = new Aptos(new AptosConfig({ network: NETWORK }))

/**
 * Sends a cross-chain message using LayerZero's OApp protocol.
 * This function demonstrates the complete flow of sending a message from Aptos to another chain.
 */
async function send() {
    // Configure message options with gas for execution
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(30000))
    const extraOptions = options.toBytes()

    let messageArray: Uint8Array
    if (getNetworkForChainId(REMOTE_EID).chainName === Chain.SOLANA) {
        const message = 'Hello, Solana!'
        const messageBytes = new TextEncoder().encode(message)

        // Create 32-byte length encoding (equivalent to abi.encode(uint256))
        const lengthBytes = new Uint8Array(32)
        const lengthView = new DataView(lengthBytes.buffer)
        lengthView.setBigUint64(24, BigInt(messageBytes.length), false)

        // Concatenate length and message bytes (equivalent to abi.encodePacked)
        messageArray = new Uint8Array(lengthBytes.length + messageBytes.length)
        messageArray.set(lengthBytes, 0)
        messageArray.set(messageBytes, lengthBytes.length)
    } else {
        const message = 'Hello, EVM!'
        const messageBytes = new TextEncoder().encode(message)
        messageArray = new Uint8Array(messageBytes)
    }

    // The Following is the code required for packaing a string message to be sent to Solana:

    // Get fee quote for the cross-chain message
    const quote = await aptos.view({
        payload: {
            function: `${OAPP_ADDRESS}::oapp::example_message_quoter`,
            functionArguments: [REMOTE_EID, messageArray, extraOptions],
        },
    })

    // Log fee details
    console.log('Quote details:')
    console.log('Native fee (octas):', quote[0])
    console.log('Native fee (APT):', Number(quote[0]) / 100000000)
    console.log('ZRO fee:', quote[1])

    // Verify account has sufficient balance
    const balance = await aptos.account.getAccountAPTAmount({ accountAddress: ACCOUNT_ADDRESS as AccountAddressInput })
    console.log('Account balance:', Number(balance) / 100000000, 'APT')

    if (Number(balance) < Number(quote[0])) {
        throw new Error(
            `Insufficient balance. Need ${Number(quote[0]) / 100000000} APT but have ${Number(balance) / 100000000} APT`
        )
    }

    // Build the transaction payload
    const payload: InputEntryFunctionData = {
        function: `${OAPP_ADDRESS}::oapp::example_message_sender`,
        functionArguments: [REMOTE_EID, messageArray, extraOptions, quote[0] as bigint],
    }

    // Create the transaction
    const transaction: SimpleTransaction = await aptos.transaction.build.simple({
        sender: ACCOUNT_ADDRESS as AccountAddressInput,
        data: payload,
        options: {
            maxGasAmount: 100000,
        },
    })

    // Sign and submit the transaction
    const signedTransaction = await aptos.signAndSubmitTransaction({
        signer: signerAccount,
        transaction: transaction,
    })

    // Wait for transaction confirmation
    const executedTransaction = await aptos.waitForTransaction({
        transactionHash: signedTransaction.hash,
    })

    console.log(`Transaction hash: ${executedTransaction.hash}`)
    console.log('Message sent!')
}

// Execute the send function and handle any errors
send().catch(console.error)
