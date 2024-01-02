import { Address } from '@layerzerolabs/devtools'
import { Timeout, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import { createConnectedContractFactory, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import { createEndpointFactory } from '@layerzerolabs/protocol-devtools-evm'

export async function getSendConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig, Uln302ExecutorConfig]> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const endpointFactory = createEndpointFactory(contractFactory)

    const localEndpointSDK = await endpointFactory({ eid: localEid, contractName: 'EndpointV2' })

    // First we get the SDK for the local send library
    let sendLibrary: Address
    if (address) {
        sendLibrary = await localEndpointSDK.getSendLibrary(address, remoteEid)
    } else {
        sendLibrary = await localEndpointSDK.getDefaultSendLibrary(remoteEid)
    }

    const localSendUlnSDK = await localEndpointSDK.getUln302SDK(sendLibrary)
    const sendUlnConfig = await localSendUlnSDK.getUlnConfig(remoteEid)
    const sendExecutorConfig = await localSendUlnSDK.getExecutorConfig(remoteEid)

    return [sendLibrary, sendUlnConfig, sendExecutorConfig]
}

export async function getReceiveConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig, Timeout]> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const endpointFactory = createEndpointFactory(contractFactory)

    const localEndpointSDK = await endpointFactory({ eid: localEid, contractName: 'EndpointV2' })

    // First we get the SDK for the local send library
    let receiveLibrary: Address
    if (address) {
        receiveLibrary = (await localEndpointSDK.getReceiveLibrary(address, remoteEid))[0]
    } else {
        receiveLibrary = await localEndpointSDK.getDefaultReceiveLibrary(remoteEid)
    }

    let receiveLibraryTimeout: Timeout
    if (address) {
        receiveLibraryTimeout = await localEndpointSDK.getReceiveLibraryTimeout(address, remoteEid)
    } else {
        receiveLibraryTimeout = await localEndpointSDK.getDefaultReceiveLibraryTimeout(remoteEid)
    }

    const localReceiveUlnSDK = await localEndpointSDK.getUln302SDK(receiveLibrary)

    const receiveUlnConfig = await localReceiveUlnSDK.getUlnConfig(remoteEid)
    return [receiveLibrary, receiveUlnConfig, receiveLibraryTimeout]
}
