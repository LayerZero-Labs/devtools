import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import 'hardhat-deploy-ethers/internal/type-extensions'
import { ethers } from 'ethers'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2
interface TaskArgs {
    networks: string
}
export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs, hre) => {
    // TODO add logging
    // const logger = createLogger()
    console.log(taskArgs)
    const networks = taskArgs.networks.split(',')
    const configByNetwork = await Promise.all(
        networks.map(async (network: string) => {
            console.log({ network })
            const environment = await getNetworkRuntimeEnvironment(network)
            const endpointV2 = await environment.ethers.getContract('EndpointV2')
            const eid = await endpointV2.eid()

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

                    let sendExecutorConfigBytes = await sendUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        1
                    )
                    let [maxMessageSize, executor] = ethers.utils.defaultAbiCoder.decode(
                        ['uint32', 'address'],
                        sendExecutorConfigBytes
                    )

                    let sendUlnConfigBytes = await sendUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        2
                    )
                    let [
                        confirmations,
                        requiredVerifiersCount,
                        optionalVerifiersCount,
                        optionalVerifiersThreshold,
                        requiredVerifiers,
                        optionalVerifiers,
                    ] = ethers.utils.defaultAbiCoder.decode(
                        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
                        sendUlnConfigBytes
                    )

                    let sendUln = {
                        maxMessageSize: maxMessageSize,
                        executor: executor,
                        confirmations: confirmations,
                        requiredVerifiersCount: requiredVerifiersCount,
                        optionalVerifiersCount: optionalVerifiersCount,
                        optionalVerifiersThreshold: optionalVerifiersThreshold,
                        requiredVerifiers: requiredVerifiers,
                        optionalVerifiers: optionalVerifiers,
                    }

                    let receiveUlnConfigBytes = await receiveUln302.getConfig(
                        remoteEid,
                        remoteEnvironment.ethers.constants.AddressZero,
                        2
                    )
                    ;[
                        confirmations,
                        requiredVerifiersCount,
                        optionalVerifiersCount,
                        optionalVerifiersThreshold,
                        requiredVerifiers,
                        optionalVerifiers,
                    ] = ethers.utils.defaultAbiCoder.decode(
                        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
                        receiveUlnConfigBytes
                    )

                    let receiveUln = {
                        confirmations: confirmations,
                        requiredVerifiersCount: requiredVerifiersCount,
                        optionalVerifiersCount: optionalVerifiersCount,
                        optionalVerifiersThreshold: optionalVerifiersThreshold,
                        requiredVerifiers: requiredVerifiers,
                        optionalVerifiers: optionalVerifiers,
                    }

                    // const consoleTableDefaultConfig = {
                    //     network,
                    //     defaultSendLibrary,
                    //     defaultReceiveLibrary,
                    //     maxMessageSize: maxMessageSize[0],
                    //     outboundConfirmations: outboundConfirmations[0].toNumber(),
                    //     executor: executor.toString(),
                    //     inboundBlockConfirmations: inboundConfirmations[0].toNumber(),
                    //     verifiers: verifiers[0].toString(),
                    //     optionalVerifiers,
                    //     optionalVerifierThreshold,
                    // }
                    return {
                        network,
                        remoteNetwork,
                        defaultSendLibrary,
                        defaultReceiveLibrary,
                        sendUln: sendUln,
                        receiveUln: receiveUln,
                    }
                })
            )
        })
    )
    console.log(configByNetwork)
    return configByNetwork
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
