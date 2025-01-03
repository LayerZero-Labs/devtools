import { getChain, getConnection } from '@layerzerolabs/devtools-movement/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-movement/sdk/oft'

import {
    getEidFromAptosNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-movement/tasks/move/utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendInitTransaction } from '@layerzerolabs/devtools-movement/tasks/move/utils/utils'

async function initOFTFA(token_name: string, token_symbol: string, icon_uri: string, project_uri: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(lzNetworkStage)
    const chain = getChain(fullnode)

    console.log(`\n⚡ Initializing ${chain}-${lzNetworkStage} OFT`)
    console.log(`   Address: ${aptosOftAddress}\n`)

    const sharedDecimals = 6
    const localDecimals = 6

    console.log(`Setting the following parameters:`)
    console.log(`\tToken Name: ${token_name}`)
    console.log(`\tToken Symbol: ${token_symbol}`)
    console.log(`\tIcon URI: ${icon_uri}`)
    console.log(`\tProject URI: ${project_uri}`)
    console.log(`\tShared Decimals: ${sharedDecimals}`)
    console.log(`\tLocal Decimals: ${localDecimals}`)

    const moveVMConnection = getConnection(chain, network, fullnode, faucet)
    const oft = new OFT(moveVMConnection, aptosOftAddress, account_address, private_key)

    const initializePayload = oft.initializeOFTFAPayload(
        token_name,
        token_symbol,
        icon_uri,
        project_uri,
        sharedDecimals,
        localDecimals
    )

    const eid = getEidFromAptosNetwork(chain, network)
    console.log('If it is already initialized, it will not be initialized again even if you say yes')
    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid }]

    sendInitTransaction(moveVMConnection, oft, account_address, payloads)
}

export { initOFTFA }
