import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, getDelegateFromLzConfig, networkToIndexerMapping, sendAllTxs } from './utils/utils'
import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({
        network: network,
        fullnode: fullnode,
        indexer: networkToIndexerMapping[network],
        faucet: faucet,
    })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)
    console.log(`\n🔧 Initializing Aptos OFT`)
    console.log(`   Address: ${aptosOftAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const initializePayload = oft.initializePayload(
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

    const eid = getEidFromAptosNetwork(network)
    const delegate = getDelegateFromLzConfig(eid)
    const setDelegatePayload = oft.setDelegatePayload(delegate)

    sendAllTxs(aptos, oft, account_address, [setDelegatePayload, initializePayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
