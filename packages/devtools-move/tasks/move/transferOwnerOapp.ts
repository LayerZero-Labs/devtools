import { createTransferOwnerOAppPayload } from './utils/moveVMOftConfigOps'
import { sendAllTxs } from './utils/utils'
import { TaskContext } from '../../sdk/baseTaskHelper'

async function transferOAppOwner(taskContext: TaskContext, newOwner: string) {
    console.log(`\n👑 Transferring ${taskContext.chain}-${taskContext.stage} OApp Ownership`)
    console.log(`\tFor OApp at: ${taskContext.oAppAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const transferOwnerPayload = await createTransferOwnerOAppPayload(taskContext.oft, newOwner, taskContext.srcEid)

    const payloads = [transferOwnerPayload]

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { transferOAppOwner }
