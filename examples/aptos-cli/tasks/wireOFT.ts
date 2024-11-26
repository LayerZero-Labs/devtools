import dotenv from 'dotenv'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../aptos-sdk/oft'
import * as yaml from 'yaml'
import * as fs from 'fs'
import * as path from 'path'
import config from '../layerzero.config'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

dotenv.config()

async function main() {
    const aptosConfig = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
        faucet: 'http://127.0.0.1:8081',
    })
    const aptos = new Aptos(aptosConfig)

    const { account_address, private_key } = parseYaml()

    const oft = new OFT(aptos, account_address, private_key)

    oft.setDelegate(account_address)

    setPeers(oft, config)
}

function setPeers(oft: OFT, config: OAppOmniGraphHardhat) {
    const contracts = config.contracts

    for (const entry of contracts) {
        const contractAddress = getContractAddress(entry.contract.eid, entry.contract.contractName)
        oft.setPeer(entry.contract.eid, contractAddress)
    }
}

function getContractAddress(eid: EndpointId, contractName: string) {
    const contractAddress = config.contracts.find((c) => c.contract.eid === eid && c.contract.contractName === contractName)?.contract.contractAddress
    return contractAddress
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
