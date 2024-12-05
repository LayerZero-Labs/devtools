import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, networkToIndexerMapping, sendAllTxs } from './utils/utils'
import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'

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
    console.log(`\n🪙 Minting Aptos OFT ✨`)
    console.log(`   Address: ${aptosOftAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const mintPayload = oft.mintPayload(account_address, 1000000000)

    sendAllTxs(aptos, oft, account_address, [mintPayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
