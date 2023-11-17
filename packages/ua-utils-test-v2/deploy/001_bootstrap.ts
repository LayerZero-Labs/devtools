import { type DeployFunction } from "hardhat-deploy/types"
import { AddressZero } from "@ethersproject/constants"
import assert from "assert"

/**
 * This deploy function will deploy and configure LayerZero endpoint
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    assert(network.config.endpointId != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()

    const endpointV2Deployment = await deployments.deploy("EndpointV2", {
        from: deployer,
        args: [network.config.endpointId, AddressZero],
    })

    const uln302Deployment = await deployments.deploy("UltraLightNode302", {
        from: deployer,
        args: [endpointV2Deployment.address, 0],
    })

    console.table({
        EndpointV2: endpointV2Deployment.address,
        UltraLightNode302: uln302Deployment.address,
    })
}

deploy.tags = ["Bootstrap", "EndpointV2"]

export default deploy
