import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { createSetBlocklistPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function blocklistWallet(walletAddress: string, block: boolean, oftType: OFTType) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔒 Blocklisting Wallet for ${chain}-${lzNetworkStage} OFT`)
    console.log(`\t📝 For: ${oftAddress}\n`)
    console.log(`\t${block ? '🚫' : '✅'} Setting wallet ${walletAddress} to ${block ? 'blocked' : 'unblocked'}`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const payload = await createSetBlocklistPayload(oft, oftType, walletAddress, block)

    sendAllTxs(aptos, oft, account_address, [payload])
}

export { blocklistWallet }
