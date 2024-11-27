import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import lzConfig from '../aptos.layerzero.config'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createEidToNetworkMapping, getConfigConnections } from './utils/utils'
import { loadAptosYamlConfig } from './utils/config'
import { ExecutorLzReceiveOption, ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'
import { ethers } from 'ethers'

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

    const connections = getConfigConnections('from', APTOS_ENDPOINTS[0])

    console.log(connections)

    console.log('Setting peers')
    await setPeers(oft, connections)

    console.log('Setting enforced options')
    await setEnforcedOptions(oft, connections)

    console.log('Setting send library')
    await setSendLibrary(oft, connections)

    console.log('Setting receive library')
    await setReceiveLibrary(oft, connections)
}

async function setSendLibrary(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    for (const entry of connections) {
        await oft.setSendLibrary(entry.to.eid, entry.config.sendLibrary)
    }
}

async function setReceiveLibrary(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    for (const entry of connections) {
        await oft.setReceiveLibrary(
            entry.to.eid,
            entry.config.receiveLibraryConfig.receiveLibrary,
            Number(entry.config.receiveLibraryConfig.gracePeriod)
        )
    }
}

async function setEnforcedOptions(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    for (const entry of connections) {
        if (!entry.config?.enforcedOptions) {
            console.log(`No enforced options specified for contract ${entry.to.contractName} on eid ${entry.to.eid}`)
            continue
        }
        console.log(`Setting enforced options for contract ${entry.to.contractName} on eid ${entry.to.eid}`)
        for (const enforcedOption of entry.config.enforcedOptions) {
            const options = createOptions(enforcedOption)

            console.log('Enforced option:', enforcedOption)
            await oft.setEnforcedOptions(entry.to.eid, enforcedOption.msgType, options)
        }
    }

    function createOptions(enforcedOption) {
        const options = Options.newOptions()
        if (enforcedOption.optionType === ExecutorOptionType.LZ_RECEIVE) {
            options.addExecutorLzReceiveOption(enforcedOption.gas, enforcedOption.value)
        } else if (enforcedOption.optionType === ExecutorOptionType.NATIVE_DROP) {
            options.addExecutorNativeDropOption(enforcedOption.amount, enforcedOption.receiver)
        }
        return options.toBytes()
    }
}

function getAptosOftAddress(network: Network) {
    const deploymentPath = path.join(__dirname, `../deployments/aptos-${network}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

async function setPeers(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const eidToNetworkMapping = createEidToNetworkMapping()

    for (const entry of connections) {
        const networkName = eidToNetworkMapping[entry.to.eid]
        const contractAddress = getContractAddress(networkName, entry.to.contractName)

        console.log(`calling set peer on ${networkName} with address ${contractAddress}, eid ${entry.to.eid}`)
        await oft.setPeer(entry.to.eid, contractAddress)
        console.log(`peer set for ${networkName} (${entry.to.eid}) -> ${contractAddress} ✓`)
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
