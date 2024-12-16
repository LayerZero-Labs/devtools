import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'

import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate, transferOwner } from './utils/aptosOftConfigOps'
import { getDelegateFromLzConfig, getMoveVMOftAddress, getOwnerFromLzConfig, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network } = await parseYaml()

    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n↗️ Transferring Ownership & Setting Aptos OFT Delegate...`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const eid = getEidFromAptosNetwork(network)
    const delegate = getDelegateFromLzConfig(eid)
    const owner = getOwnerFromLzConfig(eid)

    const setDelegatePayload = await setDelegate(oft, delegate, eid)
    const transferOwnerPayload = await transferOwner(oft, owner, eid)

    const payloads = [setDelegatePayload, transferOwnerPayload]

    sendAllTxs(aptos, oft, account_address, payloads)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
