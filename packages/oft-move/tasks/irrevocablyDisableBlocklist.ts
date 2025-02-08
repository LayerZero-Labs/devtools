import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

import { parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendAllTxs,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createIrrevocablyDisableBlocklistPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
} from '@layerzerolabs/devtools-move/tasks/move/utils/config'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

async function irrevocablyDisableBlocklist(configPath: string, oftType: OFTType) {
    const { account_address, private_key, network, fullnode } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network)

    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const lzNetworkStage = getNetworkForChainId(eid).env
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n🔧 Irrevocably Disabling Blocklist for ${chain}-${lzNetworkStage} OFT`)
    console.log(`\tFor: ${oftAddress}\n`)
    console.log(
        `\t\x1b[33m Warning: This action is irreversible and will permanently disable blocklisting ability.\x1b[0m`
    )

    const oft = new OFT(aptos, oftAddress, account_address, private_key, eid)

    const payload = createIrrevocablyDisableBlocklistPayload(oft, oftType)

    await sendAllTxs(aptos, oft, account_address, [payload])
}

export { irrevocablyDisableBlocklist }
