import { ContractFactory, ethers } from 'ethers'
import fs from 'fs'
import { createEidToNetworkMapping, getConfigConnections, getAccountConfig } from './utils/utils'
import { AptosOFTMetadata, ContractMetadataMapping, TxEidMapping, AccountData } from './utils/types'
import { createSetPeerTransactions } from './wire-evm/setPeer'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'

// import { executeTransactions } from './wire-evm/executeTransactions'
// import { createSetDelegateTransactions } from './wire-evm/setDelegate'
// import { createEnforcedOptionTransactions } from './wire-evm/setEnforcedOptions'

import { simulateTransactions } from './wire-evm/simulateTransactions'

if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

// @todo Fetch this from the config instead of hardcoding.
const EID_APTOS = EndpointId.APTOS_V2_TESTNET

/* 
Contains the network data of each eid-account pair.

eid is a primary key and it contains gasPrice and the nonce of every address
*/
export const chainDataMapper: AccountData = {}

/**
 * Main function to initialize the wiring process.
 */
async function main() {
    const connectionsToWire = getConfigConnections('to', EID_APTOS)

    const accountConfigs = getAccountConfig()
    const networks = createEidToNetworkMapping()
    const rpcUrls = createEidToNetworkMapping('url')

    // Build a Transaction mapping for each type of transaction. It is further indexed by the eid.
    const TxTypeEidMapping: TxEidMapping = {
        setPeer: {},
        setDelegate: {},
        setEnforcedOptions: {},
    }

    // Indexed by the eid it contains information about the contract, provider, and configuration of the account and oapp.
    const contractMetaData: ContractMetadataMapping = {}

    // @todo Fetch this from the config instead of hardcoding.
    const APTOS_OFT = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
    const aptosOft: AptosOFTMetadata = {
        eid: EID_APTOS,
        aptosAddress: APTOS_OFT,
        rpc: rpcUrls[EID_APTOS],
    }

    // Looping through the connections we build out the contractMetaData and TxTypeEidMapping by reading from the deployment files.
    for (const conn of connectionsToWire) {
        const fromEid = conn.from.eid
        const fromNetwork = networks[fromEid]

        const deploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[fromEid])
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        const { address, abi, bytecode } = deploymentData
        const factory = new ContractFactory(abi, bytecode, signer)

        // @todo Run this before simulation since gasPrice can vary?
        if (!chainDataMapper[fromEid]) {
            chainDataMapper[fromEid] = {
                gasPrice: await provider.getGasPrice(),
                nonce: {},
            }
        }

        if (!chainDataMapper[fromEid].nonce[signer.address]) {
            chainDataMapper[fromEid].nonce[signer.address] = await provider.getTransactionCount(signer.address)
        }

        contractMetaData[fromEid] = {
            evmAddress: address,
            contract: factory.attach(address),
            provider: provider,
            configAccount: accountConfigs[fromEid],
            configOapp: conn.config,
        }
    }

    TxTypeEidMapping['setPeer'] = await createSetPeerTransactions(contractMetaData, aptosOft)
    // eidTxMapping['steDelegate'] = await createSetDelegateTransactions(wireEvmObjects, aptosOft)
    // eidTxMapping['enforcedOptions'] = await createEnforcedOptionTransactions(wireEvmObjects, aptosOft)
    await simulateTransactions(contractMetaData, TxTypeEidMapping)
    // await executeTransactions(txs, wireEvmObjects)
}

main()
    .then(() => {
        console.log('Your OApps have now been wired with Aptos.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
