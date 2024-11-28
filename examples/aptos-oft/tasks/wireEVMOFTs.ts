import { ContractFactory, ethers } from 'ethers'
import fs from 'fs'
import { createEidToNetworkMapping, getConfigConnections } from './utils/utils'
import { WireEvm, AptosOFTMetadata } from './utils/types'
import { preCheckBalances } from './utils/wire-evm/checkBalance'
import { setPeerX } from './utils/wire-evm/setPeer'

if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

const EID_APTOS = 50008

/**
 * Main function to initialize the wiring process.
 */
async function main() {
    const connectionsToWire = getConfigConnections('to', EID_APTOS)
    const networks = createEidToNetworkMapping()
    const rpcUrls = createEidToNetworkMapping('url')

    const wireEvmObjects: WireEvm[] = []

    for (const conn of connectionsToWire) {
        const fromNetwork = networks[conn.from.eid]
        const deploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[conn.from.eid])
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        const { address, abi, bytecode } = deploymentData
        const factory = new ContractFactory(abi, bytecode, signer)

        wireEvmObjects.push({
            evmAddress: address,
            signer: signer,
            contract: factory.attach(address),
            fromEid: conn.from.eid,
        })
    }

    const APTOS_OFT = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
    const aptosOft: AptosOFTMetadata = {
        eid: EID_APTOS,
        aptosAddress: APTOS_OFT,
        rpc: rpcUrls[EID_APTOS],
    }

    console.log('Pre-checking balances...')
    await preCheckBalances(wireEvmObjects, aptosOft)

    console.log('Setting peers...')
    await setPeerX(wireEvmObjects, aptosOft)
}

main()
    .then(() => {
        console.log('Process completed successfully.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
