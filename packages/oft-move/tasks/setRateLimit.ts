import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT, OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

import {
    getEidFromMoveNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { createSetRateLimitTx } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendAllTxs,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { getLzConfig } from '@layerzerolabs/devtools-move/tasks/move/utils/config'

async function setRateLimit(
    rateLimit: bigint,
    windowSeconds: bigint,
    toEid: EndpointId,
    oftType: OFTType,
    configPath: string
) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)
    const lzConfig = await getLzConfig(configPath)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n🔧 Setting ${chain}-${lzNetworkStage} OFT Rate Limit`)
    console.log(`\tFor: ${oftAddress}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key, eid)

    const toNetwork = getNetworkForChainId(toEid)
    console.log(`\tPathway: ${chain}-${lzNetworkStage} -> ${toNetwork.chainName}-${toNetwork.env}\n`)
    console.log(`\tRate Limit: ${rateLimit}`)
    console.log(`\tWindow: ${windowSeconds} seconds\n`)

    const setRateLimitPayload = await createSetRateLimitTx(oft, rateLimit, windowSeconds, toEid, oftType)

    sendAllTxs(aptos, oft, account_address, [setRateLimitPayload])
}

export { setRateLimit }
