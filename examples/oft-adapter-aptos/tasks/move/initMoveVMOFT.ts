import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const chain = getChain(fullnode)
    const lzNetworkStage = getLzNetworkStage(network)
    const oftAdapterAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n⚡ Initializing OFT Adapter`)
    console.log(`   Address: ${oftAdapterAddress}\n`)

    const sharedDecimals = 6
    const moveVMFAAddress = '0x1'

    console.log(`Shared Decimals: ${sharedDecimals}`)
    console.log(`${chain} FA Address: ${moveVMFAAddress}`)

    const moveVMConnection = getConnection(chain, network, fullnode, faucet)
    const oft = new OFT(moveVMConnection, oftAdapterAddress, account_address, private_key)

    const initializePayload = oft.initializeAdapterPayload(moveVMFAAddress, sharedDecimals)

    const eid = getEidFromAptosNetwork(chain, network)
    const payloads = [{ payload: initializePayload, description: `Initialize ${chain} OFT`, eid }]
    sendAllTxs(moveVMConnection, oft, account_address, payloads)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
