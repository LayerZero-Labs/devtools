import { createEidToNetworkMapping, getConfigConnections } from './utils/utils'
import fs from 'fs'
import { ContractFactory, ethers, providers } from 'ethers'

// Ensure environment variable is loaded
if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

// Initialize signer with provider
let provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
let signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

const eid_aptos = 50008

// Get connections and networks mapping
const connsToWire = getConfigConnections('to', eid_aptos)
console.log(connsToWire)

const networks = createEidToNetworkMapping()

// Iterate through connections and interact with contracts
;(async () => {
    for (const conn of connsToWire) {
        const fromNetwork = networks[conn.from.eid]
        const toNetwork = networks[conn.to.eid]

        console.log(`Wire on ${fromNetwork} to ${toNetwork}`)

        // Load deployment details
        const path = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const fromNetworkDeployments = JSON.parse(fs.readFileSync(path, 'utf8'))

        new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
        new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        const address = fromNetworkDeployments.address
        const abi = fromNetworkDeployments.abi
        const bytecode = fromNetworkDeployments.bytecode

        console.log('Wiring with address: ', address)

        // Attach the deployed contract
        const factory = new ContractFactory(abi, bytecode, signer)
        const contract = factory.attach(address)

        console.log(`Owner of contract at ${address}:`, await callContractFunction(contract))

        // Uncomment to set a peer (example of state-changing function)
        await contract.setPeer(conn.to.eid, '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8')

        console.log(`Owner of contract at ${address}:`, await callContractFunction(contract))
    }
})()

// Helper function to call contract function
async function callContractFunction(contract) {
    try {
        const result = await contract.peers(eid_aptos)
        return result
    } catch (error) {
        console.error('Error calling function:', error.message)
        throw error // Re-throw the error for debugging if needed
    }
}
