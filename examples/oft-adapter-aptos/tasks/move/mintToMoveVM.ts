import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'

import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { TransactionPayload } from './utils/aptosOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(lzNetworkStage)
    console.log(`\n🪙 Minting Aptos OFT ✨`)
    console.log(`   Address: ${aptosOftAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const mintPayload = oft.mintPayload(account_address, 1000000000)
    const eid = getEidFromAptosNetwork(network)

    const transactionPayload: TransactionPayload = {
        payload: mintPayload,
        description: 'Mint Aptos OFT',
        eid: eid,
    }
    sendAllTxs(aptos, oft, account_address, [transactionPayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
