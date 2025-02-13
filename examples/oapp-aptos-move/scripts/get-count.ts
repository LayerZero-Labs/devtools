import { ethers } from 'ethers'

/**
 * A utility script to verify cross-chain message delivery by checking the counter value.
 * The counter increments each time a message is successfully received by the OApp,
 * providing a simple way to confirm that cross-chain communication is working as expected.
 */
async function main() {
    const abi = ['function counter() view returns (uint256)']

    const contractAddress = 'your-contract-address'

    const provider = new ethers.providers.JsonRpcProvider('your-rpc-url')

    const contract = new ethers.Contract(contractAddress, abi, provider)

    const counter = await contract.counter()
    console.log('Counter value:', counter.toString())
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
