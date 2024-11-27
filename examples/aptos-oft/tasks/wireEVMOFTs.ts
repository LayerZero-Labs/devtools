import { ContractFactory, ethers } from 'ethers'
import fs from 'fs'
import { createEidToNetworkMapping, getConfigConnections } from './utils/utils'

type WireEvm = {
    address: string
    signer: ethers.Wallet
    contract: ethers.Contract
}

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
async function preCheckBalances(contractFactories: WireEvm[]) {
    for (const factory of contractFactories) {
        const signer = factory.signer
        const balance = await signer.getBalance()

        const estimatedGas = await factory.contract.estimateGas.setPeer(
            EID_APTOS,
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        )

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
async function setPeerX(APTOS_OFT: string) {
    for (const conn of connectionsToWire) {
        const fromNetwork = networks[conn.from.eid]

        const deploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[conn.to.eid])
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        const { address, abi, bytecode } = deploymentData
        const factory = new ContractFactory(abi, bytecode, signer)
        const contract = factory.attach(address)

        const peer = await contract.peers(EID_APTOS)

        if (peer == APTOS_OFT) {
            const msg = `Peer already set for ${fromNetwork} @ ${address}`
            console.log(`\x1b[43m Skipping: ${msg} \x1b[0m`)
            continue
        }

        await contract.setPeer(conn.to.eid, APTOS_OFT)
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
            address,
            signer,
            contract: factory.attach(address),
        })
    }

    console.log('Pre-checking balances...')
    await preCheckBalances(wireEvmObjects)

    console.log('Setting peers...')
    await setPeerX(APTOS_OFT)
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
