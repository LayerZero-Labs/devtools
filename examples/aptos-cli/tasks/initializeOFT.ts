import { SDK as AptosSDK } from '@layerzerolabs/lz-aptos-sdk-v2'
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { Oft } from '@layerzerolabs/lz-movevm-sdk-v2'
import { Stage } from '@layerzerolabs/lz-definitions'
import { PrivateKey } from '@layerzerolabs/move-definitions'

import dotenv from 'dotenv'
dotenv.config()

async function main() {
    // the address of the wallet that will deploy the oft module
    const address = '0xb33f67711893a9497b038e68ee87c2e645dae22187ea8b2967f7dc90f7fbe695'
    // url is the aptos chain full node url
    const url = 'http://127.0.0.1:8080/v1'

    const sdk = new AptosSDK({
        stage: Stage.SANDBOX,
        provider: new Aptos(new AptosConfig({ fullnode: url })),
        accounts: {
            oft: address,
        },
    })
    // false means native type, true is adapter type.
    const oft = new Oft(sdk, false)

    // Check if already initialized
    const isInitialized = await oft.isInitialized()
    if (!isInitialized) {
        console.log('Initializing OFT')
        // Initialize the OFT with required parameters
        const tokenInfo = {
            // Required for all OFT types
            sharedDecimals: 6, // default: 6

            // Required for oft_fa / oft_coin
            tokenName: 'MyOFT', // no default, required for oft_fa/oft_coin
            symbol: 'MYOFT', // no default, required for oft_fa/oft_coin
            localDecimals: 8, // default: 8, required for oft_fa/oft_coin

            // Required only for oft_adapter_fa
            tokenAddress: '0x...', // no default, required for oft_adapter_fa

            // Optional for oft_fa
            iconUri: '', // default: ''
            projectUri: '', // default: ''

            // Optional for oft_coin
            monitorSupply: false, // default: false
        }

        const rawPrivateKey = process.env.LOCAL_DEPLOYER as string
        console.log('rawPrivateKey', rawPrivateKey)
        const tx = await oft.initialize(rawPrivateKey as PrivateKey, tokenInfo)

        console.log('Initialization transaction:', tx)
    } else {
        console.log('OFT already initialized')
    }
}

// Execute the main function and handle any errors
main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
