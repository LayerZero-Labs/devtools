import { TronWeb } from 'tronweb'

import { OmniAddress } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import ReceiveUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/ReceiveUln302.json'
import SendUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/SendUln302.json'
import ReceiveUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/ReceiveUln302.json'
import SendUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/SendUln302.json'
import { Timeout, Uln302ConfigType, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'

// Tron ULN addresses from LayerZero SDK deployments
const SEND_ULN_ADDRESS_MAINNET = SendUln302Mainnet.address
const RECEIVE_ULN_ADDRESS_MAINNET = ReceiveUln302Mainnet.address
const SEND_ULN_ADDRESS_TESTNET = SendUln302Testnet.address
const RECEIVE_ULN_ADDRESS_TESTNET = ReceiveUln302Testnet.address

/**
 * Initialize TronWeb instance
 * @param network {string} Tron network (mainnet, shasta, nile)
 * @param privateKey {string} Private key for signing transactions
 */
export function initTronWeb(network: string, privateKey: string): TronWeb {
    const fullNode =
        network === 'mainnet'
            ? 'https://api.trongrid.io'
            : network === 'shasta'
              ? 'https://api.shasta.trongrid.io'
              : 'https://api.nile.trongrid.io'

    const solidityNode = fullNode
    const eventServer = fullNode

    return new TronWeb({
        fullNode,
        solidityNode,
        eventServer,
        privateKey,
    })
}

/**
 * Get the receive config for a Tron OApp
 * @param tronWeb {TronWeb} TronWeb instance
 * @param remoteEid {EndpointId} remote eid
 * @param address {OmniAddress} address of the OApp
 * @param isTestnet {boolean} whether to use testnet addresses
 */
export async function getTronReceiveConfig(
    tronWeb: TronWeb,
    remoteEid: EndpointId,
    address: OmniAddress,
    isTestnet: boolean
): Promise<[OmniAddress, Uln302UlnConfig, Timeout] | undefined> {
    const ReceiveUln302 = isTestnet ? ReceiveUln302Testnet : ReceiveUln302Mainnet
    const RECEIVE_ULN_ADDRESS = isTestnet ? RECEIVE_ULN_ADDRESS_TESTNET : RECEIVE_ULN_ADDRESS_MAINNET
    const SEND_ULN_ADDRESS = isTestnet ? SEND_ULN_ADDRESS_TESTNET : SEND_ULN_ADDRESS_MAINNET

    // Get the ReceiveUln302 contract instance
    const receiveUln = await tronWeb.contract(ReceiveUln302.abi, RECEIVE_ULN_ADDRESS)

    // Get the receive library address
    const receiveLibrary = await receiveUln.getReceiveLibrary(address, remoteEid).call()

    return [
        receiveLibrary ?? SEND_ULN_ADDRESS,
        await receiveUln.getAppUlnConfig(address, RECEIVE_ULN_ADDRESS, remoteEid, Uln302ConfigType.Receive).call(),
        {
            lib: RECEIVE_ULN_ADDRESS,
            expiry: 0n, // Tron uses a different timeout mechanism
        },
    ]
}

/**
 * Get the send config for a Tron OApp
 * @param tronWeb {TronWeb} TronWeb instance
 * @param eid {EndpointId} remote eid
 * @param address {OmniAddress} address of the OApp
 * @param isTestnet {boolean} whether to use testnet addresses
 */
export async function getTronSendConfig(
    tronWeb: TronWeb,
    eid: EndpointId,
    address: OmniAddress,
    isTestnet: boolean
): Promise<[OmniAddress, Uln302UlnConfig, Uln302ExecutorConfig] | undefined> {
    const SendUln302 = isTestnet ? SendUln302Testnet : SendUln302Mainnet
    const SEND_ULN_ADDRESS = isTestnet ? SEND_ULN_ADDRESS_TESTNET : SEND_ULN_ADDRESS_MAINNET
    const RECEIVE_ULN_ADDRESS = isTestnet ? RECEIVE_ULN_ADDRESS_TESTNET : RECEIVE_ULN_ADDRESS_MAINNET

    // Get the SendUln302 contract instance
    const sendUln = await tronWeb.contract(SendUln302.abi, SEND_ULN_ADDRESS)

    // Get the send library address
    const sendLibrary = (await sendUln.getSendLibrary(address, eid).call()) ?? SEND_ULN_ADDRESS

    return [
        sendLibrary,
        await sendUln.getAppUlnConfig(address, RECEIVE_ULN_ADDRESS, eid, Uln302ConfigType.Send).call(),
        await sendUln.getAppExecutorConfig(address, sendLibrary, eid).call(),
    ]
}

/**
 * Helper function to convert Tron address to OmniAddress format
 * @param tronAddress {string} Tron address in hex format
 */
export function tronToOmniAddress(tronAddress: string): OmniAddress {
    // Convert Tron address to the format expected by LayerZero
    return `tron:${tronAddress}`
}

/**
 * Helper function to convert OmniAddress to Tron address format
 * @param omniAddress {OmniAddress} LayerZero OmniAddress
 */
export function omniToTronAddress(omniAddress: OmniAddress): string {
    // Extract Tron address from OmniAddress format
    return omniAddress.replace('tron:', '')
}
