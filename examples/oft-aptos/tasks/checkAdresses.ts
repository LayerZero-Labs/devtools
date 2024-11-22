/* eslint-disable turbo/no-undeclared-env-vars */
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import 'dotenv/config'
import { endpointAddresses } from './endpoint_addresses'

async function main() {
    const rawPrivateKey = process.env.APTOS_PRIVATE_KEY
    if (!rawPrivateKey) {
        throw new Error('APTOS_PRIVATE_KEY environment variable is not set')
    }

    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
    })

    const aptos = new Aptos(config)

    // Iterate through each endpoint address object
    for (const addressObj of endpointAddresses) {
        // Get the first (and only) key-value pair from the object
        const name = Object.keys(addressObj)[0]
        const address = addressObj[name]

        console.log(`\n${name} (${address}):`)

        try {
            const modules = await aptos.getAccountModules({
                accountAddress: address,
            })

            if (modules.length > 0) {
                modules.forEach((module) => {
                    console.log(`- ${module.abi?.name}`)
                })
            } else {
                console.log('No modules found')
            }
        } catch (error) {
            console.error(`Error fetching modules: ${error.message}`)
        }
    }
}

// Run the async function
main().catch(console.error)
