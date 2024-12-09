import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { ContractFactory, ethers } from 'ethers'
import fs from 'fs'
import { createEidToNetworkMapping, getConfigConnections, getAccountConfig } from './utils/utils'
import { AptosOFTMetadata, ContractMetadataMapping, TxEidMapping, eid } from './utils/types'

import { createSetPeerTransactions } from './wire-evm/setPeer'
import { createSetDelegateTransactions } from './wire-evm/setDelegate'
import { createSetEnforcedOptionsTransactions } from './wire-evm/setEnforcedOptions'
import { createSetSendLibraryTransactions } from './wire-evm/setSendLibrary'
import { createSetReceiveLibraryTransactions } from './wire-evm/setReceiveLibrary'
import { createSetReceiveLibraryTimeoutTransactions } from './wire-evm/setReceiveLibraryTimeout'

import { executeTransactions } from './wire-evm/transactionExecutor'
import AnvilForkNode from './utils/anvilForkNode'

if (!process.env.PRIVATE_KEY) {
    console.error('PRIVATE_KEY environment variable is not set.')
    process.exit(1)
}

// @todo Fetch this from the config instead of hardcoding.
const EID_APTOS = EndpointId.APTOS_V2_SANDBOX

/*
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
        setSendLibrary: {},
        setReceiveLibrary: {},
        setReceiveLibraryTimeout: {},
        sendConfig: {},
        receiveConfig: {},
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
        const fromEid = conn.from.eid as eid
        const fromNetwork = networks[fromEid]

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[fromEid])
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        const OAppDeploymentPath = `deployments/${fromNetwork}/${conn.from.contractName}.json`
        const OAppDeploymentData = JSON.parse(fs.readFileSync(OAppDeploymentPath, 'utf8'))

        const { address: oappAddress, abi: oappAbi, bytecode: oappBytecode } = OAppDeploymentData
        const OAppFactory = new ContractFactory(oappAbi, oappBytecode, signer)

        const EndpointV2DeploymentPath = `deployments/${fromNetwork}/EndpointV2.json`
        const EndpointV2DeploymentData = JSON.parse(fs.readFileSync(EndpointV2DeploymentPath, 'utf8'))

        const { address: epv2Address, abi: epv2Abi, bytecode: epv2Bytecode } = EndpointV2DeploymentData
        const EndpointV2Factory = new ContractFactory(epv2Abi, epv2Bytecode, signer)

        const OAppContract = OAppFactory.attach(oappAddress)
        const EPV2Contract = EndpointV2Factory.attach(epv2Address)

        contractMetaData[fromEid] = {
            address: {
                oapp: oappAddress,
                epv2: epv2Address,
            },
            contract: {
                oapp: OAppContract,
                epv2: EPV2Contract,
            },
            provider: provider,
            configAccount: accountConfigs[fromEid],
            configOapp: conn.config,
        }
    }

    /*
     */
    TxTypeEidMapping.setPeer = await createSetPeerTransactions(contractMetaData, aptosOft)
    TxTypeEidMapping.setDelegate = await createSetDelegateTransactions(contractMetaData, aptosOft)
    TxTypeEidMapping.setEnforcedOptions = await createSetEnforcedOptionsTransactions(contractMetaData, aptosOft)
    TxTypeEidMapping.setSendLibrary = await createSetSendLibraryTransactions(contractMetaData, aptosOft)
    TxTypeEidMapping.setReceiveLibrary = await createSetReceiveLibraryTransactions(contractMetaData, aptosOft)
    TxTypeEidMapping.setReceiveLibraryTimeout = await createSetReceiveLibraryTimeoutTransactions(
        contractMetaData,
        aptosOft
    )

    const rpcUrlSelfMap: { [eid: string]: string } = {}
    for (const [eid, eidData] of Object.entries(contractMetaData)) {
        rpcUrlSelfMap[eid] = eidData.provider.connection.url
    }
    const forkUrls = Object.values(rpcUrlSelfMap)
    const eids = Object.keys(rpcUrlSelfMap)
    const anvilForkNode = new AnvilForkNode(forkUrls, eids)
    const forkRpcMap = anvilForkNode.getRpcMap()

    try {
        await anvilForkNode.startNodes()
    } catch (error) {
        anvilForkNode.killNodes()
    }

    try {
        await executeTransactions(contractMetaData, TxTypeEidMapping, forkRpcMap)
        console.log('\nAll transactions have been SIMULATED on the blockchains.')
        await executeTransactions(contractMetaData, TxTypeEidMapping, rpcUrlSelfMap)
        console.log('\nAll transactions have been EXECUTED on the blockchains.')
    } catch (error) {
        anvilForkNode.killNodes()
        throw error.error
    }
    anvilForkNode.killNodes()
}

main()
    .then(() => {
        console.log('Your EVM OApps have now been wired with the Aptos OApp.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
