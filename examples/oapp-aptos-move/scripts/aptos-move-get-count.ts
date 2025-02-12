/**
 * @file aptos-move-get-count.ts
 * @description A script to get the current counter value from the OApp on Aptos.
 * This counter increments each time a message is successfully received by the OApp,
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
 * Gets the current counter value from the OApp contract on Aptos.
 * This function demonstrates how to call a view function on an Aptos contract.
 */
async function getCount() {
    try {
        // Call the view function to get the counter value
        const counter = await aptos.view({
            payload: {
                function: `${OAPP_ADDRESS}::oapp::get_counter`,
                functionArguments: [],
            },
        })

        console.log('Current counter value:', counter)
        return counter
    } catch (error) {
        console.error('Error getting counter value:', error)
        throw error
    }
}

// Execute the getCount function and handle any errors
getCount().catch((error) => {
    console.error(error)
    process.exit(1)
})
