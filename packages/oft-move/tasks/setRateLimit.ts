import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import { createSetRateLimitTx, sendAllTxs, TaskContext, OFTType } from '@layerzerolabs/devtools-move'

async function setRateLimit(
    taskContext: TaskContext,
    rateLimit: bigint,
    windowSeconds: bigint,
    toEid: EndpointId,
    oftType: OFTType
) {
    console.log(`\n🔧 Setting ${taskContext.chain}-${taskContext.stage} OFT Rate Limit`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)

    const toNetwork = getNetworkForChainId(toEid)
    console.log(`\tPathway: ${taskContext.chain}-${taskContext.stage} -> ${toNetwork.chainName}-${toNetwork.env}\n`)
    console.log(`\tRate Limit: ${rateLimit}`)
    console.log(`\tWindow: ${windowSeconds} seconds\n`)

    const setRateLimitPayload = await createSetRateLimitTx(taskContext.oft, rateLimit, windowSeconds, toEid, oftType)

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [setRateLimitPayload])
}

export { setRateLimit }
