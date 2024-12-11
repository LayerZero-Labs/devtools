import { Aptos, AptosConfig, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk'

import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate } from './utils/aptosOftConfigOps'
import { getAptosOftAddress, getDelegateFromLzConfig, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network } = await parseYaml()
    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)
    console.log(`\n🔧 Setting Aptos OFT Delegate`)
    console.log(`\tFor Aptos OFT: ${aptosOftAddress}\n`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const eid = getEidFromAptosNetwork(network)
    const delegate = getDelegateFromLzConfig(eid)
    const setDelegatePayload = await setDelegate(oft, delegate)

    sendAllTxs(aptos, oft, account_address, [setDelegatePayload as InputGenerateTransactionPayloadData])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
