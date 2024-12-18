import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendInitTransaction } from './utils/utils'

// TODO: update with new implementation
async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(lzNetworkStage)
    const chain = getChain(fullnode)

    console.log(`\n⚡ Initializing ${chain}-${lzNetworkStage} OFT`)
    console.log(`   Address: ${aptosOftAddress}\n`)

    const tokenName = 'OFT'
    const tokenSymbol = 'OFT'
    const sharedDecimals = 6
    const localDecimals = 6
    const monitorSupply = true

    console.log(`Setting the following parameters:`)
    console.log(`\tToken Name: ${tokenName}`)
    console.log(`\tToken Symbol: ${tokenSymbol}`)
    console.log(`\tShared Decimals: ${sharedDecimals}`)
    console.log(`\tLocal Decimals: ${localDecimals}`)
    console.log(`\tMonitor Supply: ${monitorSupply}`)

    const moveVMConnection = getConnection(chain, network, fullnode, faucet)
    const oft = new OFT(moveVMConnection, aptosOftAddress, account_address, private_key)

    const admin = await oft.getAdmin()
    console.log(`\nCurrent Admin: ${admin}`)
    console.log(`account_address: ${account_address}`)

    const initializePayload = oft.initializeCoinPayload(
        tokenName,
        tokenSymbol,
        sharedDecimals,
        localDecimals,
        monitorSupply
    )

    const eid = getEidFromAptosNetwork(chain, network)
    const payloads = [{ payload: initializePayload, description: 'Initialize Aptos OFT', eid }]

    sendInitTransaction(moveVMConnection, oft, account_address, payloads)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
