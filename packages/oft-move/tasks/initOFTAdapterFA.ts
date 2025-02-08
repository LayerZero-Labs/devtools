import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import { parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
} from '@layerzerolabs/devtools-move/tasks/move/utils/config'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendInitTransaction,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'
async function initOFTAdapterFA(configPath: string, move_vm_fa_address: string, shared_decimals: number) {
    const { account_address, private_key, network, fullnode } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const lzConfig = await getLzConfig(configPath)
    const chain = getChain(fullnode)
    const moveVMConnection = getConnection(chain, network)

    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const lzNetworkStage = getNetworkForChainId(eid).env
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
