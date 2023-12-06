import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import 'hardhat-deploy-ethers/internal/type-extensions'
import { assertHardhatDeploy, getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import { Interface } from '@ethersproject/abi'

interface TaskArgs {
    networks: string
}

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs) => {
    const networks = taskArgs.networks.split(',')
    return await Promise.all(
        networks.map(async (network: string) => {
            const defaultConfigs = {}
            const environment = await getNetworkRuntimeEnvironment(network)
            assertHardhatDeploy(environment)

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

                    const sendLibBaseArtifact = await environment.deployments.getArtifact('SendLibBase')
                    const sendLibBaseInterface = new Interface(sendLibBaseArtifact.abi)

                    const ulnBaseArtifact = await environment.deployments.getArtifact('UlnBase')
                    const ulnBaseInterface = new Interface(ulnBaseArtifact.abi)

                    const sendUln302Factory = await environment.ethers.getContractFactory('SendUln302')
                    const sendUln302 = sendUln302Factory.attach(defaultSendLibrary)

                    const receiveUln302Factory = await environment.ethers.getContractFactory('ReceiveUln302')
                    const receiveUln302 = receiveUln302Factory.attach(defaultReceiveLibrary)

                    const sendExecutorConfigBytes = await sendUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        CONFIG_TYPE_EXECUTOR
                    )
                    const [{ maxMessageSize, executor }] = sendLibBaseInterface.decodeFunctionResult(
                        'getExecutorConfig',
                        sendExecutorConfigBytes
                    )

                    const sendUlnConfigBytes = await sendUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        CONFIG_TYPE_ULN
                    )

                    const [sendUlnConfig] = ulnBaseInterface.decodeFunctionResult('getUlnConfig', sendUlnConfigBytes)

                    const sendUln = {
                        maxMessageSize: maxMessageSize,
                        executor: executor,
                        confirmations: sendUlnConfig.confirmations.toNumber(),
                        optionalDVNThreshold: sendUlnConfig.optionalDVNThreshold,
                        requiredDVNs: sendUlnConfig.requiredDVNs,
                        optionalDVNs: sendUlnConfig.optionalDVNs,
                    }

                    const receiveUlnConfigBytes = await receiveUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        CONFIG_TYPE_ULN
                    )

                    const [receiveUlnConfig] = ulnBaseInterface.decodeFunctionResult(
                        'getUlnConfig',
                        receiveUlnConfigBytes
                    )

                    const receiveUln = {
                        confirmations: receiveUlnConfig.confirmations.toNumber(),
                        optionalDVNThreshold: receiveUlnConfig.optionalDVNThreshold,
                        requiredDVNs: receiveUlnConfig.requiredDVNs,
                        optionalDVNs: receiveUlnConfig.optionalDVNs,
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
                    defaultConfigs[network] = config
                })
            )
            return defaultConfigs
        })
    )
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
