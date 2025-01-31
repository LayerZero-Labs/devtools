import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import {
    getEidFromMoveNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getLzConfig } from '@layerzerolabs/devtools-move/tasks/move/utils/config'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendInitTransaction,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function initOFTFA(
    token_name: string,
    token_symbol: string,
    icon_uri: string,
    project_uri: string,
    shared_decimals: number,
    local_decimals: number,
    configPath: string
) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const lzNetworkStage = getLzNetworkStage(network)
    const chain = getChain(fullnode)
    const lzConfig = await getLzConfig(configPath)
    const eid = getEidFromMoveNetwork(chain, network)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const aptosOftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n⚡ Initializing ${chain}-${lzNetworkStage} OFT`)
    console.log(`   Address: ${aptosOftAddress}\n`)

    console.log(`Setting the following parameters:`)
    console.log(`\tToken Name: ${token_name}`)
    console.log(`\tToken Symbol: ${token_symbol}`)
    console.log(`\tIcon URI: ${icon_uri}`)
    console.log(`\tProject URI: ${project_uri}`)
    console.log(`\tShared Decimals: ${shared_decimals}`)
    console.log(`\tLocal Decimals: ${local_decimals}`)

    const moveVMConnection = getConnection(chain, network, fullnode, faucet)
    const oft = new OFT(moveVMConnection, aptosOftAddress, account_address, private_key)

    const initializePayload = oft.initializeOFTFAPayload(
        token_name,
        token_symbol,
        icon_uri,
        project_uri,
        shared_decimals,
        local_decimals
    )

    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid }]

    sendInitTransaction(moveVMConnection, oft, account_address, payloads)
}

export { initOFTFA }
