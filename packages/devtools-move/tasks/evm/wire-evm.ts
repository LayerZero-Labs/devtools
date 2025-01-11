import fs from 'fs'

import { Contract, ethers } from 'ethers'

import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

import { getEidFromMoveNetwork, getLzNetworkStage, parseYaml } from '../move/utils/aptosNetworkParser'
import { getMoveVMOftAddress } from '../move/utils/utils'
import { createEidToNetworkMapping, getConfigConnections, getHHAccountConfig } from '../shared/utils'

import AnvilForkNode from './utils/anvilForkNode'
import { createSetDelegateTransactions } from './wire/setDelegate'
import { createSetEnforcedOptionsTransactions } from './wire/setEnforcedOptions'
import { createSetPeerTransactions } from './wire/setPeer'
import { createSetReceiveConfigTransactions } from './wire/setReceiveConfig'
import { createSetReceiveLibraryTransactions } from './wire/setReceiveLibrary'
import { createSetSendConfigTransactions } from './wire/setSendConfig'
import { createSetSendLibraryTransactions } from './wire/setSendLibrary'
import { executeTransactions } from './wire/transactionExecutor'

import type { ContractMetadataMapping, NonEvmOAppMetadata, TxEidMapping } from './utils/types'
import path from 'path'
import dotenv from 'dotenv'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

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

    const { network } = await parseYaml()
    const EID_APTOS = getEidFromMoveNetwork('aptos', network)
    const globalConfigPath = path.resolve(path.join(args.rootDir, args.oapp_config))
    // @todo grow connectionsToWire by taking in non-evm connections instead of only APTOS.
    const connectionsToWire = await getConfigConnections('to', EID_APTOS, globalConfigPath)

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
    const contractMetaData: ContractMetadataMapping = {}

    // @todo Use this as a primary key for NonEvmOAppWiring in the following code
    const lzNetworkStage = getLzNetworkStage(network)
    const APTOS_OAPP_ADDRESS = getMoveVMOftAddress(lzNetworkStage)

    const nonEvmOapp: NonEvmOAppMetadata = {
        address: APTOS_OAPP_ADDRESS,
        eid: EID_APTOS.toString(),
        rpc: rpcUrls[EID_APTOS],
    }

    /*
     * Looping through the connections we build out the contractMetaData and TxTypeEidMapping by reading from the deployment files.
     * contractMetaData contains ethers Contract objects for the OApp and EndpointV2 contracts.
     */
    for (const conn of connectionsToWire) {
        logPathwayHeader(conn)

        const fromEid = conn.from.eid
        const fromNetwork = networks[fromEid]
        const configOapp = conn?.config

        const provider = new ethers.providers.JsonRpcProvider(rpcUrls[fromEid])
        const signer = new ethers.Wallet(privateKey, provider)

        const OAppDeploymentPath = path.resolve(`deployments/${fromNetwork}/${conn.from.contractName}.json`)
        const OAppDeploymentData = JSON.parse(fs.readFileSync(OAppDeploymentPath, 'utf8'))
        const EndpointV2DeploymentData = getDeploymentAddressAndAbi(fromNetwork, 'EndpointV2')

        const { address: oappAddress, abi: oappAbi } = OAppDeploymentData
        const { address: epv2Address, abi: epv2Abi } = EndpointV2DeploymentData

        const OAppContract = new Contract(oappAddress, oappAbi, signer)
        const EPV2Contract = new Contract(epv2Address, epv2Abi, signer)

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
            configOapp: configOapp,
        }
    }

    TxTypeEidMapping.setPeer = await createSetPeerTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setDelegate = await createSetDelegateTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setEnforcedOptions = await createSetEnforcedOptionsTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setSendLibrary = await createSetSendLibraryTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.setReceiveLibrary = await createSetReceiveLibraryTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.sendConfig = await createSetSendConfigTransactions(contractMetaData, nonEvmOapp)
    TxTypeEidMapping.receiveConfig = await createSetReceiveConfigTransactions(contractMetaData, nonEvmOapp)

    // TxTypeEidMapping.setReceiveLibraryTimeout = await createSetReceiveLibraryTimeoutTransactions(
    //     contractMetaData,
    //     nonEvmOapp
    // )

    // @todo Clean this up or move to utils
    const rpcUrlSelfMap: { [eid: string]: string } = {}
    for (const [eid, eidData] of Object.entries(contractMetaData)) {
        rpcUrlSelfMap[eid] = eidData.provider.connection.url
    }

    const anvilForkNode = new AnvilForkNode(rpcUrlSelfMap, 8545)

    try {
        const forkRpcMap = await anvilForkNode.startNodes()
        await executeTransactions(contractMetaData, TxTypeEidMapping, forkRpcMap, 'dry-run', privateKey)
        await executeTransactions(contractMetaData, TxTypeEidMapping, rpcUrlSelfMap, 'broadcast', privateKey)
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
