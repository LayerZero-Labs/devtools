import { Address } from '@layerzerolabs/utils'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-utils'
import { createConnectedContractFactory, getEidForNetworkName } from '@layerzerolabs/utils-evm-hardhat'
import { Endpoint, Uln302, createUln302Factory } from '@layerzerolabs/protocol-utils-evm'

export async function getSendConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig, Uln302ExecutorConfig]> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const uln302Factory = createUln302Factory(contractFactory)
    const localEndpointSDK = new Endpoint(
        await contractFactory({ eid: localEid, contractName: 'EndpointV2' }),
        uln302Factory
    )

    // First we get the SDK for the local send library
    let sendLibrary: Address
    if (address) {
        sendLibrary = await localEndpointSDK.getSendLibrary(address, remoteEid)
    } else {
        sendLibrary = await localEndpointSDK.getDefaultSendLibrary(remoteEid)
    }

    const localSendUlnSDK = new Uln302(
        await contractFactory({ eid: localEid, contractName: 'SendUln302', address: sendLibrary })
    )

    const sendUlnConfig = await localSendUlnSDK.getUlnConfig(remoteEid)
    const sendExecutorConfig = await localSendUlnSDK.getExecutorConfig(remoteEid)
    return [sendLibrary, sendUlnConfig, sendExecutorConfig]
}

export async function getReceiveConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig]> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const uln302Factory = createUln302Factory(contractFactory)
    const localEndpointSDK = new Endpoint(
        await contractFactory({ eid: localEid, contractName: 'EndpointV2' }),
        uln302Factory
    )

    // First we get the SDK for the local send library
    let receiveLibrary: Address
    if (address) {
        receiveLibrary = (await localEndpointSDK.getReceiveLibrary(address, remoteEid))[0]
    } else {
        receiveLibrary = await localEndpointSDK.getDefaultReceiveLibrary(remoteEid)
    }

    const localReceiveUlnSDK = new Uln302(
        await contractFactory({ eid: localEid, contractName: 'ReceiveUln302', address: receiveLibrary })
    )

    const receiveUlnConfig = await localReceiveUlnSDK.getUlnConfig(remoteEid)
    return [receiveLibrary, receiveUlnConfig]
}
