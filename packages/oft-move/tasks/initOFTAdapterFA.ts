import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import {
    getEidFromAptosNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendInitTransaction } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function initOFTAdapterFA(move_vm_fa_address: string, shared_decimals: number) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const chain = getChain(fullnode)
    const lzNetworkStage = getLzNetworkStage(network)
    const oftAdapterAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n⚡ Initializing OFT Adapter`)
    console.log(`   Address: ${oftAdapterAddress}\n`)

    console.log(`Shared Decimals: ${shared_decimals}`)
    console.log(`${chain} FA Address: ${move_vm_fa_address}`)

    const moveVMConnection = getConnection(chain, network, fullnode, faucet)
    const oft = new OFT(moveVMConnection, oftAdapterAddress, account_address, private_key)

    const initializePayload = oft.initializeAdapterPayload(move_vm_fa_address, shared_decimals)

    const eid = getEidFromAptosNetwork(chain, network)
    const payloads = [{ payload: initializePayload, description: `Initialize ${chain} OFT`, eid }]

    sendInitTransaction(moveVMConnection, oft, account_address, payloads)
}

export { initOFTAdapterFA }
