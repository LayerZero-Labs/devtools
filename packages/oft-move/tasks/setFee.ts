import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createSetFeeBpsTx } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'

async function setFee(feeBps: bigint, toEid: EndpointId, oftType: OFTType) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Setting ${chain}-${lzNetworkStage} OFT Fee BPS`)
    console.log(`\tFor: ${oftAddress}\n`)

    const toNetwork = getNetworkForChainId(toEid)
    console.log(`\tPathway: ${chain}-${lzNetworkStage} -> ${toNetwork.chainName}-${toNetwork.env}\n`)
    console.log(`\tFee BPS: ${feeBps}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const setFeeBpsPayload = await createSetFeeBpsTx(oft, feeBps, toEid, oftType)

    sendAllTxs(aptos, oft, account_address, [setFeeBpsPayload])
}

export { setFee }
