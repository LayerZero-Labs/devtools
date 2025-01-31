import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { createSetPrimaryFungibleStoreFrozenPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function freezeWallet(walletAddress: string, frozen: boolean, oftType: OFTType) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(network, lzNetworkStage)

    console.log(`\n🔒 Updating Freeze status of Wallet for ${chain}-${lzNetworkStage} OFT`)
    console.log(`\t📝 For: ${oftAddress}\n`)
    console.log(`\t${frozen ? '❄️' : '🌡️'} Setting wallet ${walletAddress} to ${frozen ? 'frozen' : 'unfrozen'}`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const payload = await createSetPrimaryFungibleStoreFrozenPayload(oft, oftType, walletAddress, frozen)

    sendAllTxs(aptos, oft, account_address, [payload])
}

export { freezeWallet }
