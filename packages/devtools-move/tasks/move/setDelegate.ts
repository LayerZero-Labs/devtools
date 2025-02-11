import { createSetDelegatePayload } from './utils/moveVMOftConfigOps'
import { getDelegateFromLzConfig, sendAllTxs } from './utils/utils'
import { Aptos } from '@aptos-labs/ts-sdk'
import { TaskContext } from '../../sdk/baseTaskHelper'

async function setDelegate(taskContext: TaskContext) {
    console.log(`\n🔧 Setting ${taskContext.chain}-${taskContext.stage} OApp Delegate`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)

    const delegate = getDelegateFromLzConfig(taskContext.srcEid, taskContext.lzConfig)
    const setDelegatePayload = await createSetDelegatePayload(taskContext.oft, delegate, taskContext.srcEid)

    await sendAllTxs(taskContext.moveVMConnection as Aptos, taskContext.oft, taskContext.accountAddress, [
        setDelegatePayload,
    ])
}

export { setDelegate }
