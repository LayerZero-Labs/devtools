import { ActionType } from 'hardhat/types'
import 'hardhat-deploy-ethers/internal/type-extensions'
import { createConnectedContractFactory, getEidForNetworkName } from '@layerzerolabs/utils-evm-hardhat'
import { Endpoint, Uln302 } from '@layerzerolabs/protocol-utils-evm'
import { AddressZero } from '@ethersproject/constants'

interface TaskArgs {
    networks: string
    addresses?: string
}

export const getConfig: ActionType<TaskArgs> = async (taskArgs) => {
    const networks = new Set(taskArgs.networks.split(','))
    const addresses = taskArgs?.addresses ? taskArgs.addresses.split(',') : []
    const contractFactory = createConnectedContractFactory()
    const configs: Record<string, Record<string, unknown>> = {}

    let index = 0
    for (const localNetworkName of networks) {
        const localEid = getEidForNetworkName(localNetworkName)
        const localEndpointSDK = new Endpoint(await contractFactory({ eid: localEid, contractName: 'EndpointV2' }))
        const oappAddress = addresses.length ? addresses[index] : AddressZero
        configs[localNetworkName] = {}
        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) continue

            const remoteEid = getEidForNetworkName(remoteNetworkName)

            // First we get the SDK for the local send library
            const sendLibrary = await localEndpointSDK.getSendLibrary(oappAddress, remoteEid)
            const localSendUlnSDK = new Uln302(
                await contractFactory({ eid: localEid, contractName: 'SendUln302', address: sendLibrary })
            )

            // Then we get the SDK for the local receive library
            const [receiveLibrary, isDefault] = await localEndpointSDK.getReceiveLibrary(oappAddress, remoteEid)
            const localReceiveUlnSDK = new Uln302(
                await contractFactory({ eid: localEid, contractName: 'ReceiveUln302', address: receiveLibrary })
            )

            // Now let's get the configs
            const sendUlnConfig = await localSendUlnSDK.getUlnConfig(remoteEid)
            const sendExecutorConfig = await localSendUlnSDK.getExecutorConfig(remoteEid)
            const receiveUlnConfig = await localReceiveUlnSDK.getUlnConfig(remoteEid)

            configs[localNetworkName][remoteNetworkName] = {
                defaultSendLibrary: sendLibrary,
                defaultReceiveLibrary: receiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig,
            }

            printConsoleTable(
                localNetworkName,
                remoteNetworkName,
                sendLibrary,
                receiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig
            )
        }
        index++
    }
    return configs
}

const printConsoleTable = (
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
