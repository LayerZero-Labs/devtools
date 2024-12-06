import { ContractFactory, ethers } from 'ethers'
import fs from 'fs'
import { createEidToNetworkMapping, getConfigConnections, getAccountConfig } from './utils/utils'
import { AptosOFTMetadata, EidMetadataMapping, TxEidMapping } from './utils/types'
import { createSetPeerTransactions } from './utils/wire-evm/setPeer'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'

// import { executeTransactions } from './utils/wire-evm/executeTransactions'
// import { createSetDelegateTransactions } from './utils/wire-evm/setDelegate'
// import { createEnforcedOptionTransactions } from './utils/wire-evm/setEnforcedOptions'

import { simulateTransactions } from './utils/wire-evm/simulateTransactions'

if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

const EID_APTOS = EndpointId.APTOS_V2_TESTNET
export const chainDataMapper = {}

/**
 * Main function to initialize the wiring process.
 */
async function main() {
    const connectionsToWire = getConfigConnections('to', EID_APTOS)

    const accountConfigs = getAccountConfig()
    const networks = createEidToNetworkMapping()
    const rpcUrls = createEidToNetworkMapping('url')

    const TxTypeEidMapping: TxEidMapping = {
        setPeer: {},
        setDelegate: {},
        setEnforcedOptions: {},
    }

    const eidMetaData: EidMetadataMapping = {}

    const APTOS_OFT = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
    const aptosOft: AptosOFTMetadata = {
        eid: EID_APTOS,
        aptosAddress: APTOS_OFT,
        rpc: rpcUrls[EID_APTOS],
    }

    for (const conn of connectionsToWire) {
        const fromEid = conn.from.eid
        const fromNetwork = networks[fromEid]
        const deploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[fromEid])
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        const { address, abi, bytecode } = deploymentData
        const factory = new ContractFactory(abi, bytecode, signer)

        if (!chainDataMapper[fromEid]) {
            chainDataMapper[fromEid] = {}
            chainDataMapper[fromEid]['gasPrice'] = await provider.getGasPrice()
            chainDataMapper[fromEid]['nonce'] = await provider.getTransactionCount(signer.address)
        }

        eidMetaData[fromEid] = {
            evmAddress: address,
            contract: factory.attach(address),
            provider: provider,
            configAccount: accountConfigs[fromEid],
            configOapp: conn.config,
        }
    }

    TxTypeEidMapping['setPeer'] = await createSetPeerTransactions(eidMetaData, aptosOft)
    // eidTxMapping['steDelegate'] = await createSetDelegateTransactions(wireEvmObjects, aptosOft)
    // eidTxMapping['enforcedOptions'] = await createEnforcedOptionTransactions(wireEvmObjects, aptosOft)
    await simulateTransactions(eidMetaData, TxTypeEidMapping)
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
