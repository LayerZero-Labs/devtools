import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { ethers } from 'ethers'

/**
 * Script to analyze the decoded values and understand the decoding issue
 */
async function main() {
    const config = new AptosConfig({ network: Network.TESTNET })
    const aptos = new Aptos(config)
    const oappAddress = '<your-oapp-address>'

    console.log('Analyzing decoded values...')
    console.log('---')

    // Get all decoded values
    const [counterResult, decodedCounterResult, address1Result, address2Result, numberResult] = await Promise.all([
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_counter`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_counter`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_address1`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_address2`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_number`,
                typeArguments: [],
            },
        }),
    ])

    console.log('Current decoded values:')
    console.log('- Address 1:', address1Result[0])
    console.log('- Address 2:', address2Result[0])
    console.log('- Number:', numberResult[0])
    console.log('---')

    // What we expected to send
    console.log('Expected values:')
    console.log('- Address 1: 0x1234567890123456789012345678901234567890')
    console.log('- Address 2: 0x9876543210987654321098765432109876543210')
    console.log('- Number: 123456789012345678901234567890')
    console.log('---')

    // Analyze the decoded values
    console.log('Analysis:')

    // Address 1 is 0x20 = 32 in decimal
    console.log('\nAddress 1 (0x20 = 32):')
    console.log('- This is suspiciously the standard ABI offset value')
    console.log('- In ABI encoding, dynamic data starts with a 32-byte offset pointer')

    // Address 2 is 0xc2 = 194 in decimal
    console.log('\nAddress 2 (0xc2 = 194):')
    console.log('- 194 bytes = 0xc2 in hex')
    console.log('- This might be the length of the hex string data')

    // Let's check what our actual message would look like
    const address1 = '0x1234567890123456789012345678901234567890'
    const address2 = '0x9876543210987654321098765432109876543210'
    const number = ethers.BigNumber.from('123456789012345678901234567890')

    // Our packed message
    const packedMessage = ethers.utils.solidityPack(
        ['bytes32', 'bytes32', 'uint256'],
        [ethers.utils.hexZeroPad(address1, 32), ethers.utils.hexZeroPad(address2, 32), number]
    )

    console.log('\nOur packed message:')
    console.log('- Length:', packedMessage.length - 2, 'characters (excluding 0x)')
    console.log('- As bytes:', (packedMessage.length - 2) / 2, 'bytes')
    console.log('- Hex:', packedMessage)

    // ABI encoded version
    const abiEncoded = ethers.utils.defaultAbiCoder.encode(['string'], [packedMessage])
    console.log('\nABI-encoded version:')
    console.log('- Total length:', abiEncoded.length - 2, 'characters')
    console.log('- As bytes:', (abiEncoded.length - 2) / 2, 'bytes')
    console.log('- First 64 chars:', '0x' + abiEncoded.substring(2, 66))
    console.log('- Offset (first 32 bytes):', '0x' + abiEncoded.substring(2, 66))
    console.log('- String length (next 32 bytes):', '0x' + abiEncoded.substring(66, 130))

    // Decode the values
    const offset = parseInt(abiEncoded.substring(2, 66), 16)
    const strLength = parseInt(abiEncoded.substring(66, 130), 16)
    console.log('- Offset value:', offset, '(0x' + offset.toString(16) + ')')
    console.log('- String length value:', strLength, '(0x' + strLength.toString(16) + ')')

    console.log('\nConclusion:')
    console.log('The Move contract is reading the ABI encoding metadata instead of the actual data!')
    console.log("- It's reading byte 0 as address1 (getting the offset = 0x20 = 32)")
    console.log("- It's reading byte 32 as address2 (getting part of the length field = 0xc2 = 194)")
    console.log('- The large number is likely from reading subsequent ABI encoding bytes')
    console.log('\nThe contract needs to:')
    console.log('1. Skip the ABI encoding wrapper (first 64+ bytes)')
    console.log('2. Parse the hex string inside')
    console.log('3. Convert the hex string to bytes')
    console.log('4. Then decode the addresses and number from those bytes')
}

main().catch(console.error)
