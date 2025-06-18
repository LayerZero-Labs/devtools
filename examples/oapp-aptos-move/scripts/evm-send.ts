import { ethers } from 'ethers'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import 'dotenv/config'
import { makeBytes32 } from '../../../packages/devtools/dist'

// ABI for the functions we need
const ABI = [
    'function quote(uint32 _dstEid, string memory _message, bytes memory _options, bool _payInLzToken) public view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
    'function send(uint32 _dstEid, string memory _message, bytes calldata _options) external payable returns (tuple(bytes32 guid, uint256 nonce, bytes32 messageId))',
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

    // Destination endpoint ID for Aptos/Movement
    const aptosEid = EndpointId.APTOS_V2_TESTNET // or EndpointId.MOVEMENT_V2_TESTNET

    // Example addresses and number to encode
    const address1 = '0x1234567890123456789012345678901234567890'
    const address2 = '0x9876543210987654321098765432109876543210'
    const number = ethers.BigNumber.from('123456789012345678901234567890')

    const encodedMessage = ethers.utils.solidityPack(
        ['bytes32', 'bytes32', 'uint256'],
        [makeBytes32(address1), makeBytes32(address2), ethers.BigNumber.from(number)]
    )

    const hexString = ethers.utils.hexlify(encodedMessage)

    console.log('Encoded message:', hexString)
    console.log('Address1:', address1)
    console.log('Address2:', address2)
    console.log('Number:', number.toString())

    // Build options with gas for execution
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

    try {
        // Get quote
        const [nativeFee] = await myOApp.quote(aptosEid, hexString, options, false)
        console.log(`Quote for message: ${ethers.utils.formatEther(nativeFee)} ETH`)

        // Send message
        const tx = await myOApp.send(aptosEid, hexString, options, {
            value: nativeFee.toString(),
        })

        console.log('Sending encoded message to Aptos/Movement...')
        const receipt = await tx.wait()
        console.log(`Transaction hash: ${receipt?.transactionHash}`)
        console.log('Message sent!')
    } catch (error) {
        console.error('Error sending message:', error)
    }
}

main().catch(console.error)
