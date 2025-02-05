import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import {
    getEidFromMoveNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getLzConfig } from '@layerzerolabs/devtools-move/tasks/move/utils/config'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendInitTransaction,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function initOFTAdapterFA(configPath: string, move_vm_fa_address: string, shared_decimals: number) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const lzConfig = await getLzConfig(configPath)
    const chain = getChain(fullnode)
    const moveVMConnection = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oftAdapterAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n⚡ Initializing OFT Adapter`)
    console.log(`   Address: ${oftAdapterAddress}\n`)
    console.log(`Shared Decimals: ${shared_decimals}`)
    console.log(`${chain} FA Address: ${move_vm_fa_address}`)

    const oft = new OFT(moveVMConnection, oftAdapterAddress, account_address, private_key, eid)

    const initializePayload = oft.initializeAdapterFAPayload(move_vm_fa_address, shared_decimals)

    const payloads = [{ payload: initializePayload, description: `Initialize ${chain} OFT`, eid }]

    sendInitTransaction(moveVMConnection, oft, account_address, payloads)
}

export { initOFTAdapterFA }
