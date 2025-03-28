import { sendInitTransaction, TaskContext } from '@layerzerolabs/devtools-move'

async function initOFTAdapterFA(taskContext: TaskContext, move_vm_fa_address: string, sharedDecimals: number = 6) {
    console.log(`\n⚡ Initializing OFT Adapter`)
    console.log(`   Address: ${taskContext.oAppAddress}\n`)
    console.log(`Shared Decimals: ${sharedDecimals}`)
    console.log(`${taskContext.chain} FA Address: ${move_vm_fa_address}`)

    const initializePayload = taskContext.oft.initializeAdapterFAPayload(move_vm_fa_address, sharedDecimals)

    const payloads = [
        { payload: initializePayload, description: `Initialize ${taskContext.chain} OFT`, eid: taskContext.srcEid },
    ]

    sendInitTransaction(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { initOFTAdapterFA }
