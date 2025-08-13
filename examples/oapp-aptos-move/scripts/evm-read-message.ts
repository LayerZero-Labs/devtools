import { ethers } from 'ethers'
import 'dotenv/config'

/**
 * A utility script to verify cross-chain message delivery by reading the last received message.
 * The lastMessage variable is updated each time a message is successfully received by the OApp,
 * providing a simple way to confirm that cross-chain communication is working as expected.
 */
async function main() {
    const abi = ['function lastMessage() view returns (string)']

    const contractAddress = '<your-contract-address>'

    // Connect to provider (replace with your RPC URL)
    const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545')

    const contract = new ethers.Contract(contractAddress, abi, provider)

    const message = await contract.lastMessage()
    console.log('Last received message:', message)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
