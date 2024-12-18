import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

import { Endpoint } from '../../sdk/endpoint'
import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'
import { getConfigConnections } from '../shared/utils'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getNamedAddresses } from './utils/config'
import * as oftConfig from './utils/moveVMOftConfigOps'
import { TransactionPayload } from './utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    const chain = getChain(fullnode)

    const moveVMConnection = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const moveVMOftAddress = getMoveVMOftAddress(lzNetworkStage)
    const endpointAddress = getEndpointAddressFromNamedAddresses(getNamedAddresses(lzNetworkStage))

    console.log(`\n🔧 Wiring ${chain}-${lzNetworkStage} OFT`)
    console.log(`\tAddress: ${moveVMOftAddress}\n`)

    const oft = new OFT(moveVMConnection, moveVMOftAddress, account_address, private_key)
    const endpoint = new Endpoint(moveVMConnection, endpointAddress)

    const currDelegate = await oft.getDelegate()
    validateDelegate(currDelegate, account_address)

    const endpointId = getEidFromAptosNetwork(chain, network)
    const connections = getConfigConnections('from', endpointId)

    const txs = await createWiringTxs(oft, endpoint, connections)
    await sendAllTxs(moveVMConnection, oft, account_address, txs)
}

async function createWiringTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const setPeerTxs = await oftConfig.createSetPeerTxs(oft, connections)
    const setEnforcedOptionsTxs = await oftConfig.createSetEnforcedOptionsTxs(oft, connections)
    const setSendLibraryTxs = await oftConfig.createSetSendLibraryTxs(oft, endpoint, connections)
    const setReceiveLibraryTxs = await oftConfig.createSetReceiveLibraryTxs(oft, endpoint, connections)
    const setReceiveLibraryTimeoutTxs = await oftConfig.createSetReceiveLibraryTimeoutTxs(oft, endpoint, connections)
    const setSendConfigTxs = await oftConfig.createSetSendConfigTxs(oft, endpoint, connections)
    const setExecutorConfigTxs = await oftConfig.createSetExecutorConfigTxs(oft, endpoint, connections)
    const setReceiveConfigTxs = await oftConfig.createSetReceiveConfigTxs(oft, endpoint, connections)

    const txs = [
        ...setPeerTxs,
        ...setEnforcedOptionsTxs,
        ...setSendLibraryTxs,
        ...setReceiveLibraryTxs,
        ...setReceiveLibraryTimeoutTxs,
        ...setSendConfigTxs,
        ...setExecutorConfigTxs,
        ...setReceiveConfigTxs,
    ]

    return txs
}

function validateDelegate(currDelegate: string, account_address: string) {
    if (currDelegate != account_address) {
        throw new Error(
            `Delegate must be set to account address of the transaction senderfor wiring.\n\tCurrent delegate: ${currDelegate}, expected: ${account_address}`
        )
    }
}
function getEndpointAddressFromNamedAddresses(namedAddresses: string): string {
    const addresses = namedAddresses.split(',')
    const endpointEntry = addresses.find((addr) => addr.startsWith('endpoint_v2='))
    const endpointAddress = endpointEntry?.split('=')[1]

    if (!endpointAddress) {
        throw new Error('Endpoint address not found in named addresses configuration')
    }

    return endpointAddress
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
