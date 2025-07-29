import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import {
    DecimalsResult,
    getDecimals,
    getPeer,
    getReceiveConfig,
    getSendConfig,
    ReceiveConfigResult,
    SendConfigResult,
} from './getConfig'
import { Contract, ethers } from 'ethers'

import { getDVNsByEid } from './layerzeroApi'

const OAPP_V2_ABI = [
    'function peers(uint32 eid) view returns (bytes32)',
    'function endpoint() view returns (address)',
    'function sharedDecimals() view returns (uint8)',
    'function decimals() view returns (uint8)',
]

const ENDPOINT_V2_ABI = [
    'function defaultSendLibrary(uint32 eid) view returns (address)',
    'function defaultReceiveLibrary(uint32 eid) view returns (address)',
    'function getConfig(address oappAddress, address library, uint32 eid, uint32 configType) view returns (bytes)',
    'function getSendLibrary(address sender, uint32 eid) view returns (address lib)',
    'function getReceiveLibrary(address receiver, uint32 eid) view returns (address lib, bool isDefault)',
    'function isDefaultSendLibrary(address oappAddress, uint32 eid) view returns (bool)',
]

type contract = { address: string; eid: EndpointId; rpc: string }

type Config = {
    oappAddress: string
    fromEid: EndpointId
    toEid: EndpointId
    receiveConfig: ReceiveConfigResult
    sendConfig: SendConfigResult
    decimals: DecimalsResult
    peer: string
}

export async function getAllPathwayConfigs(contracts: contract[]): Promise<Config[]> {
    // Process all contracts in parallel
    const contractPromises = contracts.map(async (contract) => {
        console.log('Getting config for', getNetworkForChainId(contract.eid).chainName, contract.eid)

        // Create provider for this chain
        const provider = new ethers.providers.JsonRpcProvider(contract.rpc)

        // Create contract instances using the predefined ABIs
        const OAppContract = new Contract(contract.address, OAPP_V2_ABI, provider)

        // Get the endpoint address from the OApp contract
        const endpointAddress = await OAppContract.endpoint()
        const EPV2Contract = new Contract(endpointAddress, ENDPOINT_V2_ABI, provider)

        // Get decimals once per contract
        const decimals = await getDecimals(OAppContract)

        // Process each peer sequentially for this contract
        const contractConfigs: Config[] = []
        for (const peer of contracts.filter((c) => c.eid !== contract.eid)) {
            const sendConfig = await getSendConfig(EPV2Contract, contract.address, peer.eid)
            const receiveConfig = await getReceiveConfig(EPV2Contract, contract.address, peer.eid)
            const peerAddress = await getPeer(OAppContract, peer.eid)

            contractConfigs.push({
                oappAddress: contract.address,
                fromEid: contract.eid,
                toEid: peer.eid,
                receiveConfig,
                sendConfig,
                decimals,
                peer: peerAddress,
            })
        }

        console.log('Config for', getNetworkForChainId(contract.eid).chainName, contract.eid, 'received')
        console.log(`Added ${contractConfigs.length} pathway configs`)

        return contractConfigs
    })

    // Wait for all contracts to complete and flatten the results
    const allContractConfigs = await Promise.all(contractPromises)
    const configMap = allContractConfigs.flat()

    return configMap
}

export async function checkConfig(contracts: contract[]) {
    const configMap = await getAllPathwayConfigs(contracts)

    await checkDVNs(configMap)
    await checkConfirmations(configMap)
    await checkSharedDecimals(configMap)
    await checkPeers(configMap)
}

export async function checkDVNs(configMap: Config[]) {
    const dvnNames = await getDVNNames(configMap)

    for (const configA of configMap) {
        const configB = configMap.find((c) => c.fromEid === configA.toEid && c.toEid === configA.fromEid)
        if (!configB) {
            throw new Error(`No reverse config found for ${configA.fromEid} and ${configA.toEid}`)
        }

        const dvnListA = configA.sendConfig.requiredDVNs.map((dvn) => dvnNames.get([dvn, configA.fromEid] as DVNkey))
        const dvnListB = configB.receiveConfig.requiredDVNs.map((dvn) => dvnNames.get([dvn, configB.fromEid] as DVNkey))

        console.log('Comparing', getNetworkForChainId(configA.fromEid).chainName)
        console.log('to', getNetworkForChainId(configA.toEid).chainName)
        console.log('DVN list A:', dvnListA)
        console.log('DVN list B:', dvnListB)

        if (dvnListA.some((dvnA) => !dvnListB.includes(dvnA)) || dvnListB.some((dvnB) => !dvnListA.includes(dvnB))) {
            throw new Error(`DVN mismatch for ${configA.fromEid} and ${configA.toEid}`)
        }
    }
    console.log('DVNs set correctly')
}

export async function checkSharedDecimals(configMap: Config[]) {
    const sharedDecimals = configMap[0].decimals.sharedDecimals
    for (const config of configMap) {
        if (config.decimals.sharedDecimals !== sharedDecimals) {
            throw new Error(`Shared decimals mismatch for ${config.fromEid} and ${config.toEid}`)
        }
    }
    console.log('Shared decimals set correctly:', sharedDecimals)
}

export async function checkPeers(configMap: Config[]) {
    for (const configA of configMap) {
        const configB = configMap.find((c) => c.fromEid === configA.toEid && c.toEid === configA.fromEid)
        if (!configB) {
            throw new Error(`No reverse config found for ${configA.fromEid} and ${configA.toEid}`)
        }

        if (configA.peer !== configB.oappAddress) {
            throw new Error(
                `Peer mismatch for ${configA.fromEid} and ${configB.fromEid}\n${configA.peer}\n${configB.peer}`
            )
        }
    }
}

type DVNkey = [dvnAddress: string, eid: EndpointId]

export async function getDVNNames(configMap: Config[]) {
    const dvnNames: Map<DVNkey, string> = new Map()

    for (const config of configMap) {
        const dvnList = await getDVNsByEid(config.fromEid.toString())
        dvnList.forEach((dvn) => {
            dvnNames.set([dvn.address, config.fromEid], dvn.name)
        })
    }

    console.log('DVN names:', dvnNames)
    return dvnNames
}

export async function checkConfirmations(configMap: Config[]) {
    for (const configA of configMap) {
        const configB = configMap.find((c) => c.fromEid === configA.toEid && c.toEid === configA.fromEid)
        if (configA.sendConfig.confirmations !== configB?.receiveConfig.confirmations) {
            throw new Error(`Confirmations mismatch for ${configA.fromEid} and ${configA.toEid}`)
        }

        if (configA.sendConfig.optionalDVNThreshold !== configB?.receiveConfig.optionalDVNThreshold) {
            throw new Error(`Optional DVN threshold mismatch for ${configA.fromEid} and ${configA.toEid}`)
        }
    }
}
