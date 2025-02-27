import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createUnsetRateLimitTx } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { TaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'

async function unsetRateLimit(taskContext: TaskContext, toEid: EndpointId, oftType: OFTType) {
    console.log(`\n🔧 Unsetting ${taskContext.chain}-${taskContext.stage} OFT Rate Limit`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)

    const unsetRateLimitPayload = await createUnsetRateLimitTx(taskContext.oft, toEid, oftType)

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [unsetRateLimitPayload])
}

export { unsetRateLimit }
