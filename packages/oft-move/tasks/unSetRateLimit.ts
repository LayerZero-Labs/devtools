import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { createUnsetRateLimitTx } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function unsetRateLimit(toEid: EndpointId) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Unsetting ${chain}-${lzNetworkStage} OFT Rate Limit`)
    console.log(`\tFor: ${oftAddress}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const toNetwork = getNetworkForChainId(toEid)
    console.log(`\tPathway: ${chain}-${lzNetworkStage} -> ${toNetwork.chainName}-${toNetwork.env}\n`)

    const [currentLimit, currentWindow] = await oft.getRateLimitConfig(toEid)
    console.log(`\tCurrent Rate Limit: ${currentLimit}`)
    console.log(`\tCurrent Window: ${currentWindow} seconds\n`)

    const unsetRateLimitPayload = await createUnsetRateLimitTx(oft, toEid)

    sendAllTxs(aptos, oft, account_address, [unsetRateLimitPayload])
}

export { unsetRateLimit }
