import { ethers } from 'ethers'

/**
 * A utility script to verify cross-chain message delivery by checking the last received data.
 * The address1, address2, and num fields are updated each time a message is successfully received by the OApp,
 * providing a simple way to confirm that cross-chain communication is working as expected.
 */
async function main() {
    const abi = [
        'function address1() view returns (address)',
        'function address2() view returns (address)',
        'function num() view returns (uint256)',
    ]

    const contractAddress = 'your-EVM-OApp-contract-address'

    const provider = new ethers.providers.JsonRpcProvider('your-EVM-chain-rpc-url')

    const contract = new ethers.Contract(contractAddress, abi, provider)

    const address1 = await contract.address1()
    const address2 = await contract.address2()
    const num = await contract.num()

    console.log('Last received data:')
    console.log('  Address 1:', address1)
    console.log('  Address 2:', address2)
    console.log('  Number:', num.toString())
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
