import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import lzConfig from '../aptos.layerzero.config'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createEidToNetworkMapping } from './utils/utils'
import { loadAptosYamlConfig } from './utils/config'

async function main() {
    const aptosConfig = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
        faucet: 'http://127.0.0.1:8081',
    })
    // aptos v2 sandbox 50008
    const aptos = new Aptos(aptosConfig)

    const { account_address, private_key } = await parseYaml()

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

function getContractAddress(eid: EndpointId, networkName: string) {
    const deploymentPath = path.join(__dirname, `../deployments/${networkName}/abi.json`)

    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to read deployment file for network ${networkName}: ${error}`)
    }
}

async function parseYaml(): Promise<{ account_address: string; private_key: string }> {
    const aptosYamlConfig = await loadAptosYamlConfig()

    return {
        account_address: aptosYamlConfig.profiles.default.account,
        private_key: aptosYamlConfig.profiles.default.private_key,
    }
}

// Execute the main function and handle any errors
main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
