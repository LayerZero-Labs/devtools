import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, getLzNetworkStage, parseYaml } from './utils/utils'
import { Endpoint } from '../sdk/endpoint'

const ENDPOINT_ADDRESS = '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c'

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

    const initializeTx = await buildTx(aptos, oft, account_address, initializePayload)
    await oft.signSubmitAndWaitForTx(initializeTx)

    console.log(`Setting aptos OFT delegate to ${account_address}`)
    await oft.setDelegatePayload(account_address)
}

async function buildTx(aptos: Aptos, oft: OFT, account_address: string, payload: any) {
    const trans = await aptos.transaction.build.simple({
        sender: account_address,
        data: payload,
    })
    return trans
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
