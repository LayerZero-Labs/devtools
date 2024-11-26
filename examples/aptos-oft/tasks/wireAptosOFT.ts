import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import * as yaml from 'yaml'
import * as fs from 'fs'
import * as path from 'path'
import lzConfig from '../layerzero.config'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import hardhatConfig from '../hardhat.config'

async function main() {
    const aptosConfig = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
        faucet: 'http://127.0.0.1:8081',
    })
    // aptos v2 sandbox 50008
    const aptos = new Aptos(aptosConfig)

    const { account_address, private_key } = parseYaml()

    const oft = new OFT(aptos, account_address, private_key)

    // oft.setDelegate(account_address)

    setPeers(oft, lzConfig)
}

function setPeers(oft: OFT, lzConfig: OAppOmniGraphHardhat) {
    const contracts = lzConfig.contracts

    const eidToNetworkMapping = createEidToNetworkMapping()

    for (const entry of contracts) {
        const networkName = eidToNetworkMapping[entry.contract.eid]
        const contractAddress = getContractAddress(entry.contract.eid, networkName)

        console.log(`calling set peer on ${networkName} with address ${contractAddress}`)
        // oft.setPeer(entry.contract.eid, contractAddress)
    }
}

function createEidToNetworkMapping() {
    const networks = hardhatConfig.networks

    const eidNetworkNameMapping: Record<number, string> = {}
    for (const [networkName, networkConfig] of Object.entries(networks)) {
        eidNetworkNameMapping[networkConfig.eid] = networkName
    }

    console.log(eidNetworkNameMapping)
    return eidNetworkNameMapping
}

function getContractAddress(eid: EndpointId, networkName: string) {
    const deploymentPath = path.join(__dirname, `../deployments/${networkName}/abi.json`)

    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to read deployment file for network ${networkName}: ${error}`)
    }
}

function parseYaml() {
    const configPath = path.join(__dirname, '../.aptos/config.yaml')
    const configFile = fs.readFileSync(configPath, 'utf8')
    const config = yaml.parse(configFile)
    const account_address = '0x' + config.profiles.default.account
    const private_key = config.profiles.default.private_key

    return { account_address, private_key }
}

// Execute the main function and handle any errors
main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
