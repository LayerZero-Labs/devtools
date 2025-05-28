import { sendInitTransaction, TaskContext } from '@layerzerolabs/devtools-move'

import { endpointIdToChainType, ChainType } from '@layerzerolabs/lz-definitions'
import inquirer from 'inquirer'

async function initOFTFA(
    token_name: string,
    token_symbol: string,
    icon_uri: string,
    project_uri: string,
    sharedDecimals: number = 6,
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
    console.log(`\tLocal Decimals: ${local_decimals}`)

    const initializePayload = taskContext.oft.initializeOFTFAPayload(
        token_name,
        token_symbol,
        icon_uri,
        project_uri,
        sharedDecimals,
        local_decimals
    )
    const chainType = endpointIdToChainType(taskContext.srcEid)
    const INITIA_SUPPORTED_DECIMALS = 6

    // Initia enforces token decimal requirements (local decimals must be 6)
    if (chainType === ChainType.INITIA && local_decimals !== INITIA_SUPPORTED_DECIMALS) {
        console.error(
            `⚠️ Deployment Configuration Error ⚠️\n` +
                `Target Chain: Initia\n` +
                `→ Required local decimals: ${INITIA_SUPPORTED_DECIMALS}\n` +
                `→ Provided local decimals: ${local_decimals}\n\n` +
                `Initia strictly requires tokens to have exactly ${INITIA_SUPPORTED_DECIMALS} decimals.`
        )

        const { confirmDeployment } = await inquirer.prompt([
            {
                type: 'input',
                name: 'confirmDeployment',
                message: 'Do you want to proceed anyway? This may cause unexpected behavior. (y/N):',
            },
        ])

        if (confirmDeployment.trim().toLowerCase() === 'y') {
            console.warn(`⚠️ Proceeding with unsupported local decimals: ${local_decimals}`)
        } else {
            throw new Error(
                `❌ Deployment aborted.\nInitia only supports tokens with ${INITIA_SUPPORTED_DECIMALS} decimals. ` +
                    `Current config specifies: ${local_decimals}. Please update your configuration.`
            )
        }
    }

    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid: taskContext.srcEid }]

    sendInitTransaction(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { initOFTFA }
