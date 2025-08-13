/**
 * @file aptos-move-send.ts
 * @description A script to demonstrate cross-chain messaging using LayerZero's OApp protocol.
 * This script sends a string message from an Aptos chain to another blockchain (e.g., EVM chains).
 * The string is ABI-encoded on-chain for EVM compatibility.
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

import { EndpointId } from '@layerzerolabs/lz-definitions'
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
const OAPP_ADDRESS = '0x' // Set your OApp's address on Aptos
const REMOTE_EID = EndpointId.BSC_V2_TESTNET // Destination chain endpoint ID (e.g., BSC testnet)
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
 * This function demonstrates the complete flow of sending a string message from Aptos to another chain.
 * The string is ABI-encoded on-chain for EVM compatibility.
 */
async function send() {
    // Configure message options with gas for execution
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(200000), 0)
    const extraOptions = options.toBytes()

    // The message to send - just a simple string!
    // The on-chain function will handle ABI encoding for EVM compatibility
    const message = 'Hello from Aptos!'

    // Get fee quote for the cross-chain message
    // quote_send_string will ABI-encode the string internally to calculate accurate fees
    const quote = await aptos.view({
        payload: {
            function: `${OAPP_ADDRESS}::oapp::quote_send_string`,
            functionArguments: [REMOTE_EID, message, extraOptions],
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
    // send_string will ABI-encode the string on-chain before sending it cross-chain
    const payload: InputEntryFunctionData = {
        function: `${OAPP_ADDRESS}::oapp::send_string`,
        functionArguments: [REMOTE_EID, message, extraOptions, quote[0] as bigint],
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
    console.log(`Message "${message}" sent to chain ${REMOTE_EID}!`)
}

// Execute the send function and handle any errors
send().catch(console.error)
