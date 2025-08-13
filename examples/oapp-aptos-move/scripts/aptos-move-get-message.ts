/**
 * @file aptos-move-get-message.ts
 * @description A script to get the last received message from the OApp on Aptos.
 * This message is updated each time a new cross-chain message is successfully received,
 * providing a simple way to confirm that cross-chain communication is working.
 */

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// OApp configuration
const OAPP_ADDRESS = '' // Set your OApp's address on Aptos
const NETWORK = Network.TESTNET // Aptos network configuration

// Initialize Aptos client
const aptos = new Aptos(new AptosConfig({ network: NETWORK }))

/**
 * Gets the last received message from the OApp contract on Aptos.
 * This function demonstrates how to call a view function on an Aptos contract.
 */
async function getMessage() {
    try {
        // Call the view function to get the last received message
        const message = await aptos.view({
            payload: {
                function: `${OAPP_ADDRESS}::oapp::get_message`,
                functionArguments: [],
            },
        })

        console.log('Last received message:', message[0])
        return message[0]
    } catch (error) {
        console.error('Error getting message:', error)
        throw error
    }
}

// Execute the getMessage function and handle any errors
getMessage().catch((error) => {
    console.error(error)
    process.exit(1)
})
