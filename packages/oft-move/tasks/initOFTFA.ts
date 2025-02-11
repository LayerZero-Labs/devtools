import { sendInitTransaction } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { TaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

async function initOFTFA(
    token_name: string,
    token_symbol: string,
    icon_uri: string,
    project_uri: string,
    shared_decimals: number,
    local_decimals: number,
    taskContext: TaskContext
) {
    console.log(`\n⚡ Initializing ${taskContext.chain}-${taskContext.stage} OFT`)
    console.log(`   Address: ${taskContext.oAppAddress}\n`)

    console.log(`Setting the following parameters:`)
    console.log(`\tToken Name: ${token_name}`)
    console.log(`\tToken Symbol: ${token_symbol}`)
    console.log(`\tIcon URI: ${icon_uri}`)
    console.log(`\tProject URI: ${project_uri}`)
    console.log(`\tShared Decimals: ${shared_decimals}`)
    console.log(`\tLocal Decimals: ${local_decimals}`)

    const initializePayload = taskContext.oft.initializeOFTFAPayload(
        token_name,
        token_symbol,
        icon_uri,
        project_uri,
        shared_decimals,
        local_decimals
    )

    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid: taskContext.srcEid }]

    sendInitTransaction(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { initOFTFA }
