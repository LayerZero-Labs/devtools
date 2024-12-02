import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import {
    getAptosOftAddress,
    getConfigConnections,
    getEndpointId,
    getLzNetworkStage,
    parseYaml,
    sendAllTxs,
} from './utils/utils'
import * as oftConfig from './utils/aptosOftConfigOps'
import { Endpoint } from '../sdk/endpoint'
import * as readline from 'readline'

const ENDPOINT_ADDRESS = '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c'

const networkToIndexerMapping = {
    [Network.CUSTOM]: 'http://127.0.0.1:8090/v1',
}

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`using aptos network ${network}`)
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

    console.log(`Setting aptos OFT delegate to ${account_address}`)
    await oft.setDelegatePayload(account_address)

    const endpointId = getEndpointId(network, 'aptos')
    const connections = getConfigConnections('from', endpointId)

    const setPeerTxs = await oftConfig.setPeers(oft, connections)

    const setEnforcedOptionsTxs = await oftConfig.setEnforcedOptions(oft, connections)

    const setSendLibraryTxs = await oftConfig.setSendLibrary(oft, endpoint, connections)

    const setReceiveLibraryTxs = await oftConfig.setReceiveLibrary(oft, endpoint, connections)

    // const setReceiveLibraryTimeoutTxs = await oftConfig.setReceiveLibraryTimeout(oft, endpoint, connections)

    const setSendConfigTxs = await oftConfig.setSendConfig(oft, endpoint, connections)

    const setExecutorConfigTxs = await oftConfig.setExecutorConfig(oft, endpoint, connections)

    const setReceiveConfigTxs = await oftConfig.setReceiveConfig(oft, endpoint, connections)
    const txs = [
        ...setPeerTxs,
        ...setEnforcedOptionsTxs,
        ...setSendLibraryTxs,
        ...setReceiveLibraryTxs,
        // ...setReceiveLibraryTimeoutTxs,
        ...setSendConfigTxs,
        ...setExecutorConfigTxs,
        ...setReceiveConfigTxs,
    ]

    if (await promptForConfirmation(txs.length)) {
        await sendAllTxs(aptos, oft, account_address, txs)
    } else {
        console.log('Operation cancelled.')
        process.exit(0)
    }
}

async function promptForConfirmation(txCount: number): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    const answer = await new Promise<string>((resolve) => {
        rl.question(`\nProceed with executing the above ${txCount} transactions? (yes/no): `, resolve)
    })

    rl.close()
    return answer.toLowerCase() === 'yes'
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
