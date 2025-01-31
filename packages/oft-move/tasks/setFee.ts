import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

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
import { createSetFeeBpsTx } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getLzConfig } from '@layerzerolabs/devtools-move/tasks/move/utils/config'

async function setFee(feeBps: bigint, toEid: EndpointId, oftType: OFTType, configPath: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)
    const lzConfig = await getLzConfig(configPath)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

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
