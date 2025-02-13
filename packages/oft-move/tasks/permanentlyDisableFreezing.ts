import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import {
    getEidFromMoveNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendAllTxs,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createPermanentlyDisableFungibleStoreFreezingPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getLzConfig } from '@layerzerolabs/devtools-move/tasks/move/utils/config'

async function permanentlyDisableFreezing(configPath: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzConfig = await getLzConfig(configPath)
    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n🔧 Permanently Disabling Freezing for ${chain}-${lzNetworkStage} OFT`)
    console.log(`\tFor: ${oftAddress}\n`)
    console.log(`\t\x1b[33m Warning: This action is irreversible and will permanently disable freezing.\x1b[0m`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key, eid)

    const payload = createPermanentlyDisableFungibleStoreFreezingPayload(oft)

    sendAllTxs(aptos, oft, account_address, [payload])
}

export { permanentlyDisableFreezing }
