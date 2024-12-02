import { Aptos, AptosConfig, InputGenerateTransactionPayloadData, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import { getConfigConnections } from './utils/utils'
import { loadAptosYamlConfig } from './utils/config'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions-v3'
import * as oftConfig from './utils/aptosOftConfigOps'
import { Endpoint } from '../sdk/endpoint'
import * as readline from 'readline'

const ENDPOINT_ADDRESS = '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c'

const networkToIndexerMapping = {
    [Network.CUSTOM]: 'http://127.0.0.1:8090/v1',
}

// assign nonces, then for each transaction send, spam sending until its successful
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
    console.log(`using aptos oft address ${aptosOftAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)

    console.log(`Setting aptos OFT delegate to ${account_address}`)
    await oft.setDelegatePayload(account_address)

    const endpointId = getEndpointId(network, 'aptos')
    const connections = getConfigConnections('from', endpointId)

    // console.log(connections)

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

async function sendAllTxs(aptos: Aptos, oft: OFT, account_address: string, txs: InputGenerateTransactionPayloadData[]) {
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account_address })
    let sequenceNumber = parseInt(accountInfo.sequence_number)

    console.log(`\nSending ${txs.length} transactions:`)
    for (const tx of txs) {
        console.log(`\nTransaction ${sequenceNumber}:`)
        console.dir(tx, { depth: null })

        const trans = await aptos.transaction.build.simple({
            sender: account_address,
            data: tx,
            options: {
                accountSequenceNumber: sequenceNumber++,
            },
        })
        await oft.signSubmitAndWaitForTransaction(trans)
        console.log(`Transaction ${sequenceNumber - 1} completed ✓`)
    }
    console.log('\nAll transactions completed successfully')
}

function getLzNetworkStage(network: Network): Stage {
    if (network === Network.MAINNET) {
        return Stage.MAINNET
    } else if (network === Network.TESTNET) {
        return Stage.TESTNET
    } else if (network === Network.CUSTOM) {
        return Stage.SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

function getEndpointId(network: Network, chainName: string): number {
    if (chainName.toLowerCase() !== 'aptos') {
        throw new Error('Unsupported chain')
    }

    if (network === Network.MAINNET || network.toLowerCase() === 'mainnet') {
        return EndpointId.APTOS_V2_MAINNET
    } else if (network === Network.TESTNET || network.toLowerCase() === 'testnet') {
        return EndpointId.APTOS_V2_TESTNET
    } else if (network === Network.CUSTOM || network.toLowerCase() === 'sandbox') {
        return EndpointId.APTOS_V2_SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

function getAptosOftAddress(stage: Stage) {
    const deploymentPath = path.join(__dirname, `../deployments/aptos-${stage}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

function getContractAddress(networkName: string, contractName: string) {
    const deploymentPath = path.join(__dirname, `../deployments/${networkName}/${contractName}.json`)

    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to read deployment file for network ${networkName}: ${error}\n`)
    }
}

async function parseYaml(): Promise<{
    account_address: string
    private_key: string
    network: Network
    fullnode: string
    faucet: string
}> {
    const aptosYamlConfig = await loadAptosYamlConfig()

    const account_address = aptosYamlConfig.profiles.default.account
    const private_key = aptosYamlConfig.profiles.default.private_key
    const network = aptosYamlConfig.profiles.default.network.toLowerCase() as Network
    const fullnode = aptosYamlConfig.profiles.default.rest_url
    const faucet = aptosYamlConfig.profiles.default.faucet_url

    return { account_address, private_key, network, fullnode, faucet }
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
