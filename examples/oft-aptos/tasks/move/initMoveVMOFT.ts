import { getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n⚡ Initializing Aptos OFT`)
    console.log(`   Address: ${aptosOftAddress}\n`)

    const tokenName = 'OFT'
    const tokenSymbol = 'OFT'
    const iconUri = ''
    const projectUri = ''
    const sharedDecimals = 6
    const localDecimals = 6

    console.log(`\tToken Name: ${tokenName}`)
    console.log(`\tToken Symbol: ${tokenSymbol}`)
    console.log(`\tIcon URI: ${iconUri}`)
    console.log(`\tProject URI: ${projectUri}`)
    console.log(`\tShared Decimals: ${sharedDecimals}`)
    console.log(`\tLocal Decimals: ${localDecimals}`)

    const moveVMConnection = getConnection(network, fullnode, faucet)
    const oft = new OFT(moveVMConnection, aptosOftAddress, account_address, private_key)

    const initializePayload = oft.initializePayload(
        tokenName,
        tokenSymbol,
        iconUri,
        projectUri,
        sharedDecimals,
        localDecimals
    )

    const eid = getEidFromAptosNetwork(network)
    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid }]
    sendAllTxs(moveVMConnection, oft, account_address, payloads)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
