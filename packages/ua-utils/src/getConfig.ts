import { ActionType, HardhatRuntimeEnvironment } from "hardhat/types"
import { task, types } from "hardhat/config"
import { ethers } from "ethers"
import { createGetNetworkEnvironment } from "@layerzerolabs/hardhat-utils"

const action: ActionType<any> = async (taskArgs, hre) => {
    // TODO add logging
    // const logger = createLogger()

    const localNetwork = hre.network.name
    const getEnvironment = createGetNetworkEnvironment(hre)
    const localEnvironment = await getEnvironment(localNetwork)
    const localEndpointV2 = await localEnvironment.getContract("EndpointV2", localEnvironment.provider)
    const localEid = await localEndpointV2.eid()

    let localContractAddress
    if (taskArgs.name !== undefined) {
        localContractAddress = (await localEnvironment.getContract(taskArgs.name, localEnvironment.provider)).address
    } else if (taskArgs.address !== undefined) {
        localContractAddress = taskArgs.address
    } else {
        // TODO log error
        return
    }

    const ulnConfigDeployment = await hre.deployments.get("UlnConfig")
    const remoteNetworks = taskArgs.remoteNetworks.split(",")
    const configByNetwork = await Promise.all(
        remoteNetworks.map(async (remoteNetwork: string) => {
            const remoteEnvironment = await getEnvironment(remoteNetwork)
            const remoteEndpointV2 = await remoteEnvironment.getContract("EndpointV2", remoteEnvironment.provider)
            const remoteEid = await remoteEndpointV2.eid()

            const localSendLibrary = await localEndpointV2.getSendLibrary(localContractAddress, remoteEid)
            const localUlnConfig = await ethers.getContractAt(ulnConfigDeployment.abi, localSendLibrary)
            const [ulnConfigStruct, outboundConfigStruct] = await localUlnConfig.getUlnAndOutboundConfig(localContractAddress, remoteEid)

            return {
                Network: localNetwork,
                OAppaddress: localContractAddress,
                ...ulnConfigStruct,
                ...outboundConfigStruct,
            }
        })
    )
    console.table(configByNetwork)
}

task("getConfig", "outputs the application's Send and Receive Messaging Library versions and the config for remote networks")
    .addParam("remoteNetworks", "comma separated list of remote networks")
    .addOptionalParam(
        "name",
        "name of the deployed contract. Should be specified only if the deployment information is located in the deployments folder"
    )
    .addOptionalParam("address", "the contract address")
    .setAction(action)
