import { RESTClient, bcs } from '@initia/initia.js'
import 'dotenv/config'

async function generateObjectAddress(deployerAddress: string): Promise<string> {
    const rest = new RESTClient('https://rest.testnet.initia.xyz', {
        chainId: 'initiation-2',
        gasPrices: '0.15uinit',
        gasAdjustment: '1.75',
    })

    const result = await rest.move.viewFunction(
        // Replace with your deployed module address after deployment
        '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6',
        'new_get_next_object_address',
        'get_next_address',
        [],
        [bcs.address().serialize(deployerAddress).toBase64()]
    )

    return result as string
}

async function main() {
    if (!process.env.INITIA_ADDRESS) {
        throw new Error('INITIA_ADDRESS is not set in .env')
    }

    const deployerAddress = process.env.INITIA_ADDRESS

    try {
        const objectAddress = await generateObjectAddress(deployerAddress)
        console.log('Next object address will be:', objectAddress)
    } catch (error) {
        console.error('Failed to generate address:', error)
    }
}

main()
