import { Address } from '@layerzerolabs/utils'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-utils'
import { createConnectedContractFactory, getEidForNetworkName } from '@layerzerolabs/utils-evm-hardhat'
import { Endpoint, Uln302 } from '@layerzerolabs/protocol-utils-evm'

export async function getSendConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: Address
): Promise<[Address, Uln302UlnConfig, Uln302ExecutorConfig]> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const contractFactory = createConnectedContractFactory()
    const localEndpointSDK = new Endpoint(await contractFactory({ eid: localEid, contractName: 'EndpointV2' }))

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
    const localEndpointSDK = new Endpoint(await contractFactory({ eid: localEid, contractName: 'EndpointV2' }))

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
export const printConsoleTable = (
    localNetworkName: string,
    remoteNetworkName: string,
    defaultSendLibrary: string,
    defaultReceiveLibrary: string,
    sendUlnConfig: Record<any, any>,
    sendExecutorConfig: Record<any, any>,
    receiveUlnConfig: Record<any, any>
) => {
    const defaultLibraryTable = {
        network: localNetworkName,
        remoteNetwork: remoteNetworkName,
        defaultSendLibrary: defaultSendLibrary,
        defaultReceiveLibrary: defaultReceiveLibrary,
    }

    const sendUln = {
        maxMessageSize: sendExecutorConfig.maxMessageSize,
        executor: sendExecutorConfig.executor,
        confirmations: parseInt(sendUlnConfig.confirmations.toString()),
        optionalDVNThreshold: sendUlnConfig.optionalDVNThreshold,
        requiredDVNs: sendUlnConfig.requiredDVNs,
        optionalDVNs: sendUlnConfig.optionalDVNs,
    }

    const receiveUln = {
        confirmations: parseInt(receiveUlnConfig.confirmations.toString()),
        optionalDVNThreshold: receiveUlnConfig.optionalDVNThreshold,
        requiredDVNs: receiveUlnConfig.requiredDVNs,
        optionalDVNs: receiveUlnConfig.optionalDVNs,
    }

    const sendUlnConfigTable = {
        sendUln: sendUln,
    }

    const receiveUlnConfigTable = {
        receiveUln: receiveUln,
    }

    console.log(`************************************************`)
    console.log(`${localNetworkName.toUpperCase()}`)
    console.log(`************************************************`)
    console.table(defaultLibraryTable)
    console.table(sendUlnConfigTable)
    console.table(receiveUlnConfigTable)
}
