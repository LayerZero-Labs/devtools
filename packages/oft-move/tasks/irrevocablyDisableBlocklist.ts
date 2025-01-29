import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createIrrevocablyDisableBlocklistPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'

async function irrevocablyDisableBlocklist(oftType: OFTType) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Irrevocably Disabling Blocklist for ${chain}-${lzNetworkStage} OFT`)
    console.log(`\tFor: ${oftAddress}\n`)
    console.log(
        `\t\x1b[33m Warning: This action is irreversible and will permanently disable blocklisting ability.\x1b[0m`
    )

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const payload = createIrrevocablyDisableBlocklistPayload(oft, oftType)

    sendAllTxs(aptos, oft, account_address, [payload])
}

export { irrevocablyDisableBlocklist }
