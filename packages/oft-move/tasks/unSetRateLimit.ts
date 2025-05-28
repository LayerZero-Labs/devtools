import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createUnsetRateLimitTx, sendAllTxs, TaskContext, OFTType } from '@layerzerolabs/devtools-move'

async function unsetRateLimit(taskContext: TaskContext, toEid: EndpointId, oftType: OFTType) {
    console.log(`\n🔧 Unsetting ${taskContext.chain}-${taskContext.stage} OFT Rate Limit`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)

    const unsetRateLimitPayload = await createUnsetRateLimitTx(taskContext.oft, toEid, oftType)

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [unsetRateLimitPayload])
}

export { unsetRateLimit }
