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
    const rawPrivateKey = process.env.LOCAL_DEPLOYER as string

}

// Execute the main function and handle any errors
main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
