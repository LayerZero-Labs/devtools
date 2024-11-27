import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import lzConfig from '../aptos.layerzero.config'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createEidToNetworkMapping } from './utils/utils'
import { loadAptosYamlConfig } from './utils/config'

const APTOS_ENDPOINTS = [50008]

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

    const aptosOftAddress = getAptosOftAddress(network)
    console.log(`using aptos oft address ${aptosOftAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    console.log(`Setting delegate to ${account_address}`)
    await oft.setDelegate(account_address)

    console.log('Setting peers')
    await setPeers(oft, lzConfig)

    console.log('Setting enforced options')
    await setEnforcedOptions(oft, lzConfig)
}

async function setEnforcedOptions(oft: OFT, lzConfig: OAppOmniGraphHardhat) {
    const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toBytes()
    await oft.setEnforcedOptions(EndpointId.BSC_TESTNET, 1, options)
}

function getAptosOftAddress(network: Network) {
    const deploymentPath = path.join(__dirname, `../deployments/aptos-${network}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

async function setPeers(oft: OFT, lzConfig: OAppOmniGraphHardhat) {
    const contracts = lzConfig.contracts

    const eidToNetworkMapping = createEidToNetworkMapping()

    for (const entry of contracts) {
        // skip aptos contracts (we are not wiring aptos to aptos)
        if (APTOS_ENDPOINTS.includes(entry.contract.eid)) {
            console.log(`Skipping Aptos endpoint ${entry.contract.eid}`)
            continue
        }

        const networkName = eidToNetworkMapping[entry.contract.eid]
        const contractAddress = getContractAddress(networkName, entry.contract.contractName)

        console.log(`calling set peer on ${networkName} with address ${contractAddress}, eid ${entry.contract.eid}`)
        await oft.setPeer(entry.contract.eid, contractAddress)
        console.log(`peer set for ${networkName} (${entry.contract.eid}) -> ${contractAddress} ✓`)
    }
}

function getContractAddress(networkName: string, contractName: string) {
    const deploymentPath = path.join(__dirname, `../deployments/${networkName}/${contractName}.json`)

    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to read deployment file for network ${networkName}: ${error}`)
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
