import fs from 'fs'

import { Contract, ethers } from 'ethers'

import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

import { createEidToNetworkMapping, getConfigConnectionsFromChainType, getHHAccountConfig } from '../shared/utils'

import AnvilForkNode from './utils/anvilForkNode'
import { createSetDelegateTransactions } from './wire/setDelegate'
import { createSetEnforcedOptionsTransactions } from './wire/setEnforcedOptions'
import { createSetPeerTransactions } from './wire/setPeer'
import { createSetReceiveConfigTransactions } from './wire/setReceiveConfig'
import { createSetReceiveLibraryTransactions } from './wire/setReceiveLibrary'
import { createSetSendConfigTransactions } from './wire/setSendConfig'
import { createSetSendLibraryTransactions } from './wire/setSendLibrary'
import { executeTransactions } from './wire/transactionExecutor'

import type { OmniContractMetadataMapping, TxEidMapping } from './utils/types'
import path from 'path'
import dotenv from 'dotenv'
import { getNetworkForChainId, ChainType } from '@layerzerolabs/lz-definitions'
import { OAppEdgeConfig, OmniEdgeHardhat } from '@layerzerolabs/toolbox-hardhat'
import { createSetReceiveLibraryTimeoutTransactions } from './wire/setReceiveLibraryTimeout'

/**
 * @description Handles wiring of EVM contracts with the Aptos OApp
 * @dev Creates ethers's populated transactions for the various transaction types (setPeer, setDelegate, setEnforcedOptions, setSendLibrary, setReceiveLibrary, setReceiveLibraryTimeout). It then simulates them on a forked network before executing
 */
async function wireEvm(args: any) {
    const envPath = path.resolve(path.join(args.rootDir, '.env'))
    const env = dotenv.config({ path: envPath })
    if (!env.parsed || env.error?.message !== undefined) {
        console.error('Failed to load .env file.')
        process.exit(1)
    }

    const privateKey = env.parsed.EVM_PRIVATE_KEY

    if (!privateKey) {
        console.error('EVM_PRIVATE_KEY is not set in .env file')
        process.exit(1)
    }

    const globalConfigPath = path.resolve(path.join(args.rootDir, args.oapp_config))
    const connectionsToWire = await getConfigConnectionsFromChainType('from', ChainType.EVM, globalConfigPath)
    const accountConfigs = await getHHAccountConfig(globalConfigPath)
    const networks = await createEidToNetworkMapping('networkName')
    const rpcUrls = await createEidToNetworkMapping('url')

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
    const omniContracts: OmniContractMetadataMapping = {}

    logPathwayHeader(connectionsToWire)
    /*
     * Looping through the connections we build out the omniContracts and TxTypeEidMapping by reading from the deployment files.
     * omniContracts contains ethers Contract objects for the OApp and EndpointV2 contracts.
     */
    for (const conn of connectionsToWire) {
        const fromEid = conn.from.eid
        const toEid = conn.to.eid
        const fromNetwork = networks[fromEid]
        const toNetwork = networks[toEid]
        const configOapp = conn?.config

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[fromEid])
        const signer = new ethers.Wallet(privateKey, provider)

        const OAppDeploymentPath = path.resolve(`deployments/${fromNetwork}/${conn.from.contractName}.json`)
        const OAppDeploymentData = JSON.parse(fs.readFileSync(OAppDeploymentPath, 'utf8'))

        const WireOAppDeploymentPath = path.resolve(`deployments/${toNetwork}/${conn.to.contractName}.json`)
        const WireOAppDeploymentData = JSON.parse(fs.readFileSync(WireOAppDeploymentPath, 'utf8'))

        const EndpointV2DeploymentData = getDeploymentAddressAndAbi(fromNetwork, 'EndpointV2')

        const { address: oappAddress, abi: oappAbi } = OAppDeploymentData
        const { address: epv2Address, abi: epv2Abi } = EndpointV2DeploymentData

        const OAppContract = new Contract(oappAddress, oappAbi, signer)
        const EPV2Contract = new Contract(epv2Address, epv2Abi, signer)

        const currWireOntoOapps = omniContracts[fromEid]?.wireOntoOapps ?? []
        const wireOntoOapp = { eid: toEid.toString(), address: WireOAppDeploymentData.address }
        currWireOntoOapps.push(wireOntoOapp)

        omniContracts[fromEid] = {
            address: {
                oapp: oappAddress,
                epv2: epv2Address,
            },
            contract: {
                oapp: OAppContract,
                epv2: EPV2Contract,
            },
            wireOntoOapps: currWireOntoOapps,
            provider: provider,
            configAccount: accountConfigs[fromEid],
            configOapp: configOapp,
        }
    }

    TxTypeEidMapping.setPeer = await createSetPeerTransactions(omniContracts)
    TxTypeEidMapping.setDelegate = await createSetDelegateTransactions(omniContracts)
    TxTypeEidMapping.setEnforcedOptions = await createSetEnforcedOptionsTransactions(omniContracts)
    TxTypeEidMapping.setSendLibrary = await createSetSendLibraryTransactions(omniContracts)
    TxTypeEidMapping.setReceiveLibrary = await createSetReceiveLibraryTransactions(omniContracts)
    TxTypeEidMapping.sendConfig = await createSetSendConfigTransactions(omniContracts)
    TxTypeEidMapping.receiveConfig = await createSetReceiveConfigTransactions(omniContracts)
    TxTypeEidMapping.setReceiveLibraryTimeout = await createSetReceiveLibraryTimeoutTransactions(omniContracts)

    // @todo Clean this up or move to utils
    const rpcUrlSelfMap: { [eid: string]: string } = {}
    for (const [eid, eidData] of Object.entries(omniContracts)) {
        rpcUrlSelfMap[eid] = eidData.provider.connection.url
    }

    const anvilForkNode = new AnvilForkNode(rpcUrlSelfMap, 8545)

    try {
        const forkRpcMap = await anvilForkNode.startNodes()

        await executeTransactions(omniContracts, TxTypeEidMapping, forkRpcMap, 'dry-run', privateKey, args)
        await executeTransactions(omniContracts, TxTypeEidMapping, rpcUrlSelfMap, 'broadcast', privateKey, args)
    } catch (error) {
        anvilForkNode.killNodes()
        throw new Error(`Failed to wire EVM contracts: ${error}`)
    }
    anvilForkNode.killNodes()
}

function logPathwayHeader(connections: OmniEdgeHardhat<OAppEdgeConfig | undefined>[]) {
    const pathwayStrings = []
    let largestPathwayString = 0
    console.log('Found wire connection for pathways:')
    for (const [_fromEid, eidData] of Object.entries(connections)) {
        const fromNetwork = getNetworkForChainId(Number(eidData.from.eid))
        const toNetwork = getNetworkForChainId(Number(eidData.to.eid))

        const pathwayString = `${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`

        pathwayStrings.push(pathwayString)
        if (pathwayString.length > largestPathwayString) {
            largestPathwayString = pathwayString.length
        }
    }
    const borderLine = '━'.repeat(largestPathwayString + 5)
    console.log(borderLine)
    for (const [index, pathwayString] of pathwayStrings.entries()) {
        console.log(`${(index + 1).toString().padStart(2, ' ')}: ${pathwayString}`)
    }
    console.log(`${borderLine}`)
    console.log('🔄 Building wire transactions for all the above pathways.\n')
}

export { wireEvm }
