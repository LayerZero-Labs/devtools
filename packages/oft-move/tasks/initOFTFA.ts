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

    // Initia only supports local decimals = 6
    if (chainType == ChainType.INITIA && local_decimals != INITIA_SUPPORTED_DECIMALS) {
        console.log(
            `It looks like you're trying to deploy an OFT to initia. \n This requires local decimals = ${INITIA_SUPPORTED_DECIMALS}. Found ${local_decimals} in config`
        )
        const { proceedWithDeployment } = await inquirer.prompt([
            {
                type: 'input',
                name: 'proceedWithDeployment',
                message: 'Would you like to continue? Are you really sure? (y/n)',
            },
        ])
        if (proceedWithDeployment == 'y') {
            console.log(`Proceeding with ${local_decimals}`)
        } else {
            throw new Error(
                `OFTFA config : Initia only supportts local decimals = ${INITIA_SUPPORTED_DECIMALS}. Found ${local_decimals} in config`
            )
        }
    }

    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid: taskContext.srcEid }]

    sendInitTransaction(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, payloads)
}

export { initOFTFA }
