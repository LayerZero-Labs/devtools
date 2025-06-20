import { ethers } from 'ethers'

/**
 * A utility script to verify cross-chain message delivery by checking the last received message.
 * The lastMessage is updated each time a message is successfully received by the OApp,
 * providing a simple way to confirm that cross-chain communication is working as expected.
 */
async function main() {
    const abi = ['function lastMessage() view returns (string)']

    const contractAddress = 'your-EVM-OApp-contract-address'

    const provider = new ethers.providers.JsonRpcProvider('your-EVM-chain-rpc-url')

    const contract = new ethers.Contract(contractAddress, abi, provider)

    const lastMessage = await contract.lastMessage()
    console.log('Last received message:', lastMessage)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
