import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, getConfigConnections, networkToIndexerMapping, sendAllTxs } from './utils/utils'
import { getLzNetworkStage, getEidFromAptosNetwork, parseYaml } from './utils/aptosNetworkParser'
import * as oftConfig from './utils/aptosOftConfigOps'
import { Endpoint } from '../sdk/endpoint'

const ENDPOINT_ADDRESS = '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}\n`)

    const aptosConfig = new AptosConfig({
        network: network,
        fullnode: fullnode,
        indexer: networkToIndexerMapping[network],
        faucet: faucet,
    })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)
    console.log(`\n🔧 Configuring Aptos OFT Contract`)
    console.log(`   Address: ${aptosOftAddress}\n`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)
    const currDelegate = await oft.getDelegate()
    validateDelegate(currDelegate, account_address)

    const endpointId = getEidFromAptosNetwork(network)
    const connections = getConfigConnections('from', endpointId)

    const setPeerPayloads = await oftConfig.setPeers(oft, connections)
    const setEnforcedOptionsPayloads = await oftConfig.setEnforcedOptions(oft, connections)
    const setSendLibraryPayloads = await oftConfig.setSendLibrary(oft, endpoint, connections)
    const setReceiveLibraryPayloads = await oftConfig.setReceiveLibrary(oft, endpoint, connections)
    // const setReceiveLibraryTimeoutPayloads = await oftConfig.setReceiveLibraryTimeout(oft, endpoint, connections)
    const setSendConfigPayloads = await oftConfig.setSendConfig(oft, endpoint, connections)
    const setExecutorConfigPayloads = await oftConfig.setExecutorConfig(oft, endpoint, connections)
    const setReceiveConfigPayloads = await oftConfig.setReceiveConfig(oft, endpoint, connections)

    const payloads = [
        ...setPeerPayloads,
        ...setEnforcedOptionsPayloads,
        ...setSendLibraryPayloads,
        ...setReceiveLibraryPayloads,
        // ...setReceiveLibraryTimeoutPayloads,
        ...setSendConfigPayloads,
        ...setExecutorConfigPayloads,
        ...setReceiveConfigPayloads,
    ]

    await sendAllTxs(aptos, oft, account_address, payloads)
}

function validateDelegate(currDelegate, account_address: string) {
    if (currDelegate != account_address) {
        throw new Error(
            `Delegate must be set to account address of the transaction senderfor wiring.\n\tCurrent delegate: ${currDelegate}, expected: ${account_address}`
        )
    }
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
