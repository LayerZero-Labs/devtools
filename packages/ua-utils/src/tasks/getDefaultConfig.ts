import { ActionType } from "hardhat/types"
import { task } from "hardhat/config"
import { createGetNetworkEnvironment } from "@layerzerolabs/hardhat-utils"
import { createGetDefaultConfig } from "@/utils/config"

interface TaskArguments {
    networks: string
}

const action: ActionType<TaskArguments> = async (taskArgs, hre) => {
    const networks = taskArgs.networks.split(",")
    const getEnvironment = createGetNetworkEnvironment(hre)
    const getDefaultConfig = createGetDefaultConfig(getEnvironment)
    const configByNetwork = await Promise.all(networks.map(getDefaultConfig))

    console.table(configByNetwork)
}

task("getDefaultConfig", "Outputs the default Send and Receive Messaging Library versions and the default application config")
    .addParam("networks", "comma separated list of networks")
    .setAction(action)
