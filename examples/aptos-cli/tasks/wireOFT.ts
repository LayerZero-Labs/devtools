import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { Oft } from '@layerzerolabs/lz-movevm-sdk-v2'
import { Stage } from '@layerzerolabs/lz-definitions'
import { PrivateKey } from '@layerzerolabs/move-definitions'

import dotenv from 'dotenv'
dotenv.config()

async function main() {
    // the address of the wallet that will deploy the oft module
    const address = '0x8CEA84A194CE8032CDD6E12DD87735B4F03A5BA428F3C4265813C7A39EC984D8'
    // url is the aptos chain full node url
    const url = 'http://127.0.0.1:8080/v1'
    const indexer = 'http://127.0.0.1:8090/v1'

    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: url,
        indexer: indexer,
    })
    const aptos = new Aptos(config)



}

function getKey() {
    return '0xC4A953452FB957EDDC47E309B5679C020E09C4D3C872BDA43569CBFF6671DCA6'
}

// Execute the main function and handle any errors
main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
