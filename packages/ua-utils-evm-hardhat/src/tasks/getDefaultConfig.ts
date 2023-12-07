import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import 'hardhat-deploy-ethers/internal/type-extensions'
import { createConnectedContractFactory, getEidForNetworkName } from '@layerzerolabs/utils-evm-hardhat'
import { Endpoint, Uln302 } from '@layerzerolabs/protocol-utils-evm'

interface TaskArgs {
    networks: string
}

export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs) => {
    const networks = new Set(taskArgs.networks.split(','))
    const contractFactory = createConnectedContractFactory()
    const configs: Record<string, Record<string, unknown>> = {}

    for (const localNetworkName of networks) {
        const localEid = getEidForNetworkName(localNetworkName)
        const localEndpointSDK = new Endpoint(await contractFactory({ eid: localEid, contractName: 'EndpointV2' }))

        configs[localNetworkName] = {}

        for (const remoteNetworkName of networks) {
            if (remoteNetworkName === localNetworkName) continue

            const remoteEid = getEidForNetworkName(remoteNetworkName)

            // First we get the SDK for the local send library
            const defaultSendLibrary = await localEndpointSDK.defaultSendLibrary(remoteEid)
            const localSendUlnSDK = new Uln302(
                await contractFactory({ eid: localEid, contractName: 'SendUln302', address: defaultSendLibrary })
            )

            // Then we get the SDK for the local receive library
            const defaultReceiveLibrary = await localEndpointSDK.defaultReceiveLibrary(remoteEid)
            const localReceiveUlnSDK = new Uln302(
                await contractFactory({ eid: localEid, contractName: 'ReceiveUln302', address: defaultReceiveLibrary })
            )

            // Now let's get the configs
            const sendUlnConfig = await localSendUlnSDK.getUlnConfig(remoteEid)
            const sendExecutorConfig = await localSendUlnSDK.getExecutorConfig(remoteEid)
            const receiveUlnConfig = await localReceiveUlnSDK.getUlnConfig(remoteEid)

            configs[localNetworkName][remoteNetworkName] = {
                defaultSendLibrary: defaultSendLibrary,
                defaultReceiveLibrary: defaultReceiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig,
            }

            printConsoleTable(
                localNetworkName,
                remoteNetworkName,
                defaultSendLibrary,
                defaultReceiveLibrary,
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig
            )
        }
    }
    return configs
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)

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
