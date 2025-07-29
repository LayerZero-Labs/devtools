import { Contract, utils } from 'ethers'

import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface SendConfigResult {
    confirmations?: bigint
    optionalDVNThreshold?: number
    requiredDVNs: string[]
    requiredDVNCount?: number
    optionalDVNs?: string[]
}

export interface ReceiveConfigResult {
    confirmations?: bigint
    optionalDVNThreshold?: number
    requiredDVNs: string[]
    requiredDVNCount?: number
    optionalDVNs?: string[]
}

export interface DecimalsResult {
    sharedDecimals: number
    localDecimals: number
}

/**
 * Retrieves and decodes the current send configuration for a given OApp and peer EID
 * @param epv2Contract - The EndpointV2 contract instance
 * @param oappAddress - The OApp contract address
 * @param peerEid - The peer endpoint ID
 * @returns Promise<SendConfigResult> - The decoded send configuration
 */
export async function getSendConfig(
    epv2Contract: Contract,
    oappAddress: string,
    peerEid: EndpointId
): Promise<SendConfigResult> {
    const actualSendLibrary = await getDefaultSendLibrary(epv2Contract, peerEid)

    const ulnConfig = await epv2Contract.getConfig(oappAddress, actualSendLibrary, peerEid, 2)

    if (ulnConfig === '0x' || ulnConfig.length <= 2) {
        throw new Error(
            `No ULN config data returned for OApp ${oappAddress}, library ${actualSendLibrary}, EID ${peerEid}`
        )
    }

    const decoded = utils.defaultAbiCoder.decode(
        [
            'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ],
        ulnConfig
    )

    const result = {
        confirmations: BigInt(decoded[0]['confirmations']),
        requiredDVNs: decoded[0]['requiredDVNs'],
        optionalDVNs: decoded[0]['optionalDVNs'],
        optionalDVNThreshold: decoded[0]['optionalDVNThreshold'],
        requiredDVNCount: decoded[0]['requiredDVNCount'],
        optionalDVNCount: decoded[0]['optionalDVNCount'],
    }
    return result
}

export async function getDefaultSendLibrary(epv2Contract: Contract, peerEid: EndpointId): Promise<string> {
    const sendLib = await epv2Contract.defaultSendLibrary(peerEid)

    const sendLibAddress = utils.getAddress(sendLib)

    return sendLibAddress
}

/**
 * Retrieves and decodes the current receive configuration for a given OApp and peer EID
 * @param epv2Contract - The EndpointV2 contract instance
 * @param oappAddress - The OApp contract address
 * @param peerEid - The peer endpoint ID
 * @returns Promise<ReceiveConfigResult> - The decoded receive configuration
 */
export async function getReceiveConfig(
    epv2Contract: Contract,
    oappAddress: string,
    peerEid: EndpointId
): Promise<ReceiveConfigResult> {
    const actualReceiveLibrary = await getDefaultReceiveLibrary(epv2Contract, peerEid)

    const config = await epv2Contract.getConfig(oappAddress, actualReceiveLibrary, peerEid, 2)

    const decoded = utils.defaultAbiCoder.decode(
        [
            'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ],
        config
    )

    const result = {
        confirmations: BigInt(decoded[0]['confirmations']),
        requiredDVNs: decoded[0]['requiredDVNs'],
        optionalDVNs: decoded[0]['optionalDVNs'],
        optionalDVNThreshold: decoded[0]['optionalDVNThreshold'],
        requiredDVNCount: decoded[0]['requiredDVNCount'],
        optionalDVNCount: decoded[0]['optionalDVNCount'],
    }
    return result
}

export async function getDefaultReceiveLibrary(epv2Contract: Contract, peerEid: EndpointId): Promise<string> {
    const recvLib = await epv2Contract.defaultReceiveLibrary(peerEid)

    const recvLibAddress = utils.getAddress(recvLib)

    return recvLibAddress
}

/**
 * Retrieves the shared decimals and local decimals from an OFT contract
 * @param oftContract - The OFT contract instance
 * @returns Promise<DecimalsResult> - The decimals configuration
 */
export async function getDecimals(oftContract: Contract): Promise<DecimalsResult> {
    let sharedDecimals: number = 0
    let localDecimals: number = 0

    // Try to get shared decimals (OFT-specific)
    try {
        sharedDecimals = await oftContract.sharedDecimals()
    } catch (error) {
        // Not an OFT contract
    }

    // Try to get local decimals (ERC20-style)
    try {
        localDecimals = await oftContract.decimals()
    } catch (error) {
        // Not a token contract
        console.log('Contract at', oftContract.address, 'eid', oftContract.eid, 'is not a token contract')
    }

    return {
        sharedDecimals,
        localDecimals,
    }
}

export async function getPeer(contract: Contract, eid: EndpointId) {
    return await contract.peers(eid)
}
