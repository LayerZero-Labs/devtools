import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate } from './utils/aptosOftConfigOps'
import { getDelegateFromLzConfig, getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Setting ${chain}-${lzNetworkStage} OFT Delegate`)
    console.log(`\tFor: ${oftAddress}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const eid = getEidFromAptosNetwork('aptos', network)
    const delegate = getDelegateFromLzConfig(eid)

    const setDelegatePayload = await setDelegate(oft, delegate, eid)

    sendAllTxs(aptos, oft, account_address, [setDelegatePayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
