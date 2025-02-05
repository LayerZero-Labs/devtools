import { RESTClient } from '@initia/initia.js'

async function checkObject(objectAddress: string) {
    const rest = new RESTClient('https://rest.testnet.initia.xyz', {
        chainId: 'initiation-2',
        gasPrices: '0.15uinit',
        gasAdjustment: '1.75',
    })

    try {
        const result = await rest.move.viewFunction(
            // Replace with your deployed module address
            '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6',
            'object_info',
            'check_object_info',
            [],
            [objectAddress]
        )
        console.log('Object info (is_object, owner):', result)
    } catch (error) {
        console.error('Error checking object:', error)
    }
}

// Use the txhash you got from deployment
checkObject('0x98601a9a29b91ad87221ac21bb6787786dea72d6ca459722f30235fa944813db')
