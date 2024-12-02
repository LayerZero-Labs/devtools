import { Aptos, AptosConfig, InputGenerateTransactionPayloadData, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, getLzNetworkStage, parseYaml, sendAllTxs } from './utils/utils'

const networkToIndexerMapping = {
    [Network.CUSTOM]: 'http://127.0.0.1:8090/v1',
}

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`using aptos network ${network}`)
    const aptosConfig = new AptosConfig({
        network: network,
        fullnode: fullnode,
        indexer: networkToIndexerMapping[network],
        faucet: faucet,
    })

    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)
    console.log(`\n🔧 Initializing Aptos OFT Contract`)
    console.log(`   Address: ${aptosOftAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const initializePayload = await oft.initializePayload(
        // token_name: Uint8Array
        'OFT',
        // symbol: Uint8Array
        'OFT',
        // icon_uri: Uint8Array
        '',
        // project_uri: Uint8Array
        '',
        // shared_decimals: number
        6,
        // local_decimals: number
        6
    )

    const setDelegatePayload = await oft.setDelegatePayload(account_address)

    sendAllTxs(aptos, oft, account_address, [
        initializePayload as InputGenerateTransactionPayloadData,
        setDelegatePayload as InputGenerateTransactionPayloadData,
    ])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
