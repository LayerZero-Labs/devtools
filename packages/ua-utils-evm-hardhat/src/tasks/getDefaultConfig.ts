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

            const remoteEid = getEidForNetworkName(localNetworkName)

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
                sendUlnConfig,
                sendExecutorConfig,
                receiveUlnConfig,
            }

            console.table(sendUlnConfig)
            console.table(sendExecutorConfig)
            console.table(receiveUlnConfig)
        }
    }
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
