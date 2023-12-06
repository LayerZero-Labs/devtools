import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import 'hardhat-deploy-ethers/internal/type-extensions'
import { ethers } from 'ethers'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'

interface TaskArgs {
    networks: string
}
export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs) => {
    const networks = taskArgs.networks.split(',')
    const configByNetwork = await Promise.all(
        networks.map(async (network: string) => {
            const defaultConfigs = {}
            const environment = await getNetworkRuntimeEnvironment(network)
            const endpointV2 = await environment.ethers.getContract('EndpointV2')

            await Promise.all(
                networks.map(async (remoteNetwork) => {
                    // skip wiring itself
                    if (network === remoteNetwork) return

                    const remoteEnvironment = await getNetworkRuntimeEnvironment(remoteNetwork)
                    const remoteEndpointV2 = await remoteEnvironment.ethers.getContract('EndpointV2')
                    const remoteEid = await remoteEndpointV2.eid()

                    const defaultSendLibrary = await endpointV2.defaultSendLibrary(remoteEid)
                    const defaultReceiveLibrary = await endpointV2.defaultReceiveLibrary(remoteEid)

                    const sendUln302Factory = await environment.ethers.getContractFactory('SendUln302')
                    const sendUln302 = sendUln302Factory.attach(defaultSendLibrary)

                    const receiveUln302Factory = await environment.ethers.getContractFactory('ReceiveUln302')
                    const receiveUln302 = receiveUln302Factory.attach(defaultReceiveLibrary)

                    const sendExecutorConfigBytes = await sendUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        1
                    )

                    const [maxMessageSize, executor] = ethers.utils.defaultAbiCoder.decode(
                        ['uint32', 'address'],
                        sendExecutorConfigBytes
                    )

                    const sendUlnConfigBytes = await sendUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        2
                    )

                    const decodedSendUlnConfig = ethers.utils.defaultAbiCoder.decode(
                        ['tuple(uint64,uint8,uint8,uint8,address[],address[])'],
                        sendUlnConfigBytes
                    )

                    const sendUln = {
                        maxMessageSize: maxMessageSize,
                        executor: executor,
                        confirmations: decodedSendUlnConfig[0][0].toNumber(),
                        requiredDVNCount: decodedSendUlnConfig[0][1],
                        optionalDVNCount: decodedSendUlnConfig[0][2],
                        optionalDVNThreshold: decodedSendUlnConfig[0][3],
                        requiredDVNs: decodedSendUlnConfig[0][4],
                        optionalDVNs: decodedSendUlnConfig[0][5],
                    }

                    const receiveUlnConfigBytes = await receiveUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        2
                    )
                    const decodedReceiveUlnConfig = ethers.utils.defaultAbiCoder.decode(
                        ['tuple(uint64,uint8,uint8,uint8,address[],address[])'],
                        receiveUlnConfigBytes
                    )

                    const receiveUln = {
                        confirmations: decodedReceiveUlnConfig[0][0].toNumber(),
                        requiredDVNCount: decodedReceiveUlnConfig[0][1],
                        optionalDVNCount: decodedReceiveUlnConfig[0][2],
                        optionalDVNThreshold: decodedReceiveUlnConfig[0][3],
                        requiredDVNs: decodedReceiveUlnConfig[0][4],
                        optionalDVNs: decodedReceiveUlnConfig[0][5],
                    }

                    const defaultLibrary = {
                        network: network,
                        remoteNetwork: remoteNetwork,
                        defaultSendLibrary: defaultSendLibrary,
                        defaultReceiveLibrary: defaultReceiveLibrary,
                    }

                    const ulnConfig = {
                        sendUln: sendUln,
                        receiveUln: receiveUln,
                    }

                    const config = {
                        defaultLibrary: defaultLibrary,
                        ulnConfig: ulnConfig,
                    }

                    console.log(`************************************************`)
                    console.log(`${network.toUpperCase()}`)
                    console.log(`************************************************`)
                    console.table(defaultLibrary)
                    console.table(ulnConfig)
                    defaultConfigs[`${network}`] = config
                })
            )
            return defaultConfigs
        })
    )
    return configByNetwork
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
