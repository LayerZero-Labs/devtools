import { Endpoint } from '../../sdk/endpoint'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'
import { getConfigConnections } from '../shared/utils'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import * as oftConfig from './utils/aptosOftConfigOps'
import { getNamedAddresses } from './utils/config'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}\n`)

    const moveVMConnection = getConnection(network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const moveVMOftAddress = getMoveVMOftAddress(lzNetworkStage)
    const endpointAddress = getEndpointAddressFromNamedAddresses(getNamedAddresses(lzNetworkStage))

    console.log(`\n🔧 Configuring Aptos OFT Contract`)
    console.log(`\tAddress: ${moveVMOftAddress}\n`)

    const oft = new OFT(moveVMConnection, moveVMOftAddress, account_address, private_key)
    const endpoint = new Endpoint(moveVMConnection, endpointAddress)
    const currDelegate = await oft.getDelegate()
    validateDelegate(currDelegate, account_address)

    const endpointId = getEidFromAptosNetwork(network)
    const connections = getConfigConnections('from', endpointId)

    const setPeerPayloads = await oftConfig.createSetPeerTxs(oft, connections)
    const setEnforcedOptionsPayloads = await oftConfig.createSetEnforcedOptionsTxs(oft, connections)
    const setSendLibraryPayloads = await oftConfig.createSetSendLibraryTxs(oft, endpoint, connections)
    const setReceiveLibraryPayloads = await oftConfig.createSetReceiveLibraryTxs(oft, endpoint, connections)
    const setReceiveLibraryTimeoutPayloads = await oftConfig.createSetReceiveLibraryTimeoutTxs(
        oft,
        endpoint,
        connections
    )
    const setSendConfigPayloads = await oftConfig.createSetSendConfigTxs(oft, endpoint, connections)
    const setExecutorConfigPayloads = await oftConfig.createSetExecutorConfigTxs(oft, endpoint, connections)
    const setReceiveConfigPayloads = await oftConfig.createSetReceiveConfigTxs(oft, endpoint, connections)

    const payloads = [
        ...setPeerPayloads,
        ...setEnforcedOptionsPayloads,
        ...setSendLibraryPayloads,
        ...setReceiveLibraryPayloads,
        ...setReceiveLibraryTimeoutPayloads,
        ...setSendConfigPayloads,
        ...setExecutorConfigPayloads,
        ...setReceiveConfigPayloads,
    ]

    await sendAllTxs(moveVMConnection, oft, account_address, payloads)
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
