import { sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createPermanentlyDisableFungibleStoreFreezingPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { TaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

async function permanentlyDisableFreezing(taskContext: TaskContext) {
    console.log(`\n🔧 Permanently Disabling Freezing for ${taskContext.chain}-${taskContext.stage} OFT`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)
    console.log(`\t\x1b[33m Warning: This action is irreversible and will permanently disable freezing.\x1b[0m`)

    const payload = createPermanentlyDisableFungibleStoreFreezingPayload(taskContext.oft)

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [payload])
}

export { permanentlyDisableFreezing }
