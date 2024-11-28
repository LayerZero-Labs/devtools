import { ContractFactory, ethers } from 'ethers'
import fs from 'fs'
import { createEidToNetworkMapping, getConfigConnections } from './utils/utils'
import { WireEvm } from './utils/types'

if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

const EID_APTOS = 50008

const connectionsToWire = getConfigConnections('to', EID_APTOS)
const networks = createEidToNetworkMapping()
const rpcUrls = createEidToNetworkMapping('url')

/**
 * Pre-check balances for the provided contract factories.
 * Ensures sufficient balance for the `setPeer` gas estimation.
 */
async function preCheckBalances(wireFactories: WireEvm[], APTOS_OFT: string) {
    for (const wireFactory of wireFactories) {
        const signer = wireFactory.signer
        const balance = await signer.getBalance()

        const estimatedGas = await wireFactory.contract.estimateGas.setPeer(EID_APTOS, APTOS_OFT)

        if (balance.lt(estimatedGas)) {
            const errMsg = `chain id - ${await signer.getChainId()} @ ${signer.address} `
            console.error(`\x1b[41m Error: Insufficient Signer Balance \x1b[0m ${errMsg}`)
            process.exit(1)
        }
    }
}

/**
 * Sets peer information for connections to wire.
 */
async function setPeerX(wireFactories: WireEvm[], APTOS_OFT: string) {
    for (const wireFactory of wireFactories) {
        const peer = await wireFactory.contract.peers(EID_APTOS)
        const address = wireFactory.evmAddress
        const eid = wireFactory.fromEid
        const fromNetwork = networks[eid]

        if (peer == APTOS_OFT) {
            const msg = `Peer already set for ${fromNetwork} @ ${address}`
            console.log(`\x1b[43m Skipping: ${msg} \x1b[0m`)
            continue
        }
        await wireFactory.contract.setPeer(eid, APTOS_OFT)
        const msg = `Peer set successfully for ${fromNetwork} @ ${address}`
        console.log(`\x1b[42m Success: ${msg} \x1b[0m`)
    }
}

/**
 * Main function to initialize the wiring process.
 */
async function main() {
    const wireEvmObjects: WireEvm[] = []
    const APTOS_OFT = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'

    for (const conn of connectionsToWire) {
        const fromNetwork = networks[conn.from.eid]
        const deploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[conn.to.eid])
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

    console.log('Pre-checking balances...')
    await preCheckBalances(wireEvmObjects, APTOS_OFT)

    console.log('Setting peers...')
    await setPeerX(wireEvmObjects, APTOS_OFT)
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
