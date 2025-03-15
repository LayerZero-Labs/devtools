import { sendInitTransaction, TaskContext } from '@layerzerolabs/devtools-move'

async function initOFTAdapterCoin(taskContext: TaskContext) {
    console.log(`\n⚡ Initializing OFT Adapter`)
    console.log(`   Address: ${taskContext.oAppAddress}\n`)

    const initializeAdapterCoinPayload = taskContext.oft.initializeAdapterCoinPayload()
    const payloads = [
        {
            payload: initializeAdapterCoinPayload,
            description: `Initialize ${taskContext.chain} OFT`,
            eid: taskContext.srcEid,
        },
    ]
    sendInitTransaction(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { initOFTAdapterCoin }
