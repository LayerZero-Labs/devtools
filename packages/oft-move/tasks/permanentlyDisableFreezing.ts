import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createPermanentlyDisableFungibleStoreFreezingPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'

async function permanentlyDisableFreezing() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Permanently Disabling Freezing for ${chain}-${lzNetworkStage} OFT`)
    console.log(`\tFor: ${oftAddress}\n`)
    console.log(`\t\x1b[33m Warning: This action is irreversible and will permanently disable freezing.\x1b[0m`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const payload = createPermanentlyDisableFungibleStoreFreezingPayload(oft)

    sendAllTxs(aptos, oft, account_address, [payload])
}

export { permanentlyDisableFreezing }
