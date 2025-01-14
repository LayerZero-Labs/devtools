import fs from 'fs'

import { Contract, ethers } from 'ethers'

import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

import { createEidToNetworkMapping, getConfigConnectionsFromChainType, getHHAccountConfig } from '../shared/utils'
import { basexToBytes32 } from '../shared/basexToBytes32'

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
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { createSetReceiveLibraryTimeoutTransactions } from './wire/setReceiveLibraryTimeout'

/**
 * @description Handles wiring of EVM contracts with the Aptos OApp
 * @dev Creates ethers's populated transactions for the various transaction types (setPeer, setDelegate, setEnforcedOptions, setSendLibrary, setReceiveLibrary, setReceiveLibraryTimeout). It then simulates them on a forked network before executing
 */
export async function createEvmOmniContracts(
    args: any,
    privateKey: string,
    chainType: ChainType = ChainType.EVM,
    isWire: boolean = false
) {
    const globalConfigPath = path.resolve(path.join(args.rootDir, args.oapp_config))
    const connectionsToWire = await getConfigConnectionsFromChainType('from', chainType, globalConfigPath)
    const accountConfigs = await getHHAccountConfig(globalConfigPath)
    const networks = await createEidToNetworkMapping('networkName')
    const rpcUrls = await createEidToNetworkMapping('url')

    // Indexed by the eid it contains information about the contract, provider, and configuration of the account and oapp.
    const omniContracts: OmniContractMetadataMapping = {}

    if (isWire) {
        logPathwayHeader(connectionsToWire)
    }

    /*
     * Looping through the connections we build out the omniContracts and TxTypeEidMapping by reading from the deployment files.
     * omniContracts contains ethers Contract objects for the OApp and EndpointV2 contracts.
     */
    for (const conn of connectionsToWire) {
        if (isWire) {
            logPathwayHeader(conn)
        }
        const fromEid = conn.from.eid
        const toEid = conn.to.eid.toString()
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

        const currPeers = omniContracts[fromEid]?.peers ?? []
        const peer = { eid: toEid, address: basexToBytes32(WireOAppDeploymentData.address, toEid) }
        currPeers.push(peer)

        omniContracts[fromEid] = {
            address: {
                oapp: oappAddress,
                epv2: epv2Address,
            },
            contract: {
                oapp: OAppContract,
                epv2: EPV2Contract,
            },
            peers: currPeers,
            provider: provider,
            configAccount: accountConfigs[fromEid],
            configOapp: configOapp,
        }
    }
    return omniContracts
}

export function readPrivateKey(args: any) {
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

    return privateKey
}

async function wireEvm(args: any) {
    const privateKey = readPrivateKey(args)

    const omniContracts = await createEvmOmniContracts(args, privateKey, ChainType.EVM, true)

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

function logPathwayHeader(connection: OAppOmniGraphHardhat['connections'][number]) {
    const fromNetwork = getNetworkForChainId(connection.from.eid)
    const toNetwork = getNetworkForChainId(connection.to.eid)

    const pathwayString = `🔄 Building wire transactions for pathway: ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env} 🔄`
    const borderLine = '━'.repeat(pathwayString.length)

    console.log(borderLine)
    console.log(pathwayString)
    console.log(`${borderLine}\n`)
}

export { wireEvm }
