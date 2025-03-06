import { createTransferObjectOwnerPayload } from './utils/moveVMOftConfigOps'
import { sendAllTxs } from './utils/utils'
import { TaskContext } from '../../sdk/baseTaskHelper'

async function transferObjectOwner(taskContext: TaskContext, newOwner: string) {
    console.log(`\n👑 Transferring ${taskContext.chain}-${taskContext.stage} Object Ownership`)
    console.log(`\tFor Object at: ${taskContext.oAppAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const transferOwnerPayload = createTransferObjectOwnerPayload(taskContext.oAppAddress, newOwner)

    const payloads = [transferOwnerPayload]

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { transferObjectOwner }
