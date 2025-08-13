import { ethers } from 'ethers'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import 'dotenv/config'

// ABI for the functions we need
const ABI = [
    'function quoteSendString(uint32 _dstEid, string memory _string, bytes memory _options, bool _payInLzToken) public view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
    'function sendString(uint32 _dstEid, string memory _string, bytes calldata _options) external payable',
]

async function main() {
    // Check for private key
    const privateKey = process.env.EVM_PRIVATE_KEY
    if (!privateKey) {
        throw new Error('Please set EVM_PRIVATE_KEY environment variable')
    }

    // Connect to provider (replace with your RPC URL)
    const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545')
    const wallet = new ethers.Wallet(privateKey, provider)

    // Contract address
    const contractAddress = '<your-contract-address>'

    // Create contract instance
    const myOApp = new ethers.Contract(contractAddress, ABI, wallet)

    // Destination endpoint ID for Aptos
    const aptosEid = EndpointId.APTOS_V2_TESTNET

    // Message to send
    const message = 'Hello Aptos!'

    // Build options with gas for execution
    const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0) // Similar to test file
        .toHex()
        .toString()

    try {
        // Get quote
        const [nativeFee] = await myOApp.quoteSendString(aptosEid, message, options, false)
        console.log(`Quote for message: ${nativeFee} ETH`)

        // Send message
        const tx = await myOApp.sendString(aptosEid, message, options, {
            value: nativeFee.toString(),
        })

        console.log('Sending message to Aptos...')
        const receipt = await tx.wait()
        console.log(`Transaction hash: ${receipt?.transactionHash}`)
        console.log('Message sent!')
    } catch (error) {
        console.error('Error sending message:', error)
    }
}

main().catch(console.error)
