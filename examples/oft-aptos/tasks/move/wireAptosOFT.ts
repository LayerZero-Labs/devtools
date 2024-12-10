import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../../sdk/oft'
import { getAptosOftAddress, sendAllTxs } from './utils/utils'
import { getConfigConnections } from '../shared/utils'
import { getLzNetworkStage, getEidFromAptosNetwork, parseYaml } from './utils/aptosNetworkParser'
import * as oftConfig from './utils/aptosOftConfigOps'
import { Endpoint } from '../../sdk/endpoint'
import { getNamedAddresses } from './utils/config'

async function main() {
    const { account_address, private_key, network } = await parseYaml()
    console.log(`Using aptos network ${network}\n`)

    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)
    const endpointAddress = getEndpointAddressFromNamedAddresses(getNamedAddresses(lzNetworkStage))

    console.log(`\n🔧 Configuring Aptos OFT Contract`)
    console.log(`\tAddress: ${aptosOftAddress}\n`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const endpoint = new Endpoint(aptos, endpointAddress)
    const currDelegate = await oft.getDelegate()
    validateDelegate(currDelegate, account_address)

    const endpointId = getEidFromAptosNetwork(network)
    const connections = getConfigConnections('from', endpointId)

    const setPeerPayloads = await oftConfig.setPeers(oft, connections)
    const setEnforcedOptionsPayloads = await oftConfig.setEnforcedOptions(oft, connections)
    const setSendLibraryPayloads = await oftConfig.setSendLibrary(oft, endpoint, connections)
    const setReceiveLibraryPayloads = await oftConfig.setReceiveLibrary(oft, endpoint, connections)
    const setReceiveLibraryTimeoutPayloads = await oftConfig.setReceiveLibraryTimeout(oft, endpoint, connections)
    const setSendConfigPayloads = await oftConfig.setSendConfig(oft, endpoint, connections)
    const setExecutorConfigPayloads = await oftConfig.setExecutorConfig(oft, endpoint, connections)
    const setReceiveConfigPayloads = await oftConfig.setReceiveConfig(oft, endpoint, connections)

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

    await sendAllTxs(aptos, oft, account_address, payloads)
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
