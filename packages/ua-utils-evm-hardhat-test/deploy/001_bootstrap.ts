import { type DeployFunction } from 'hardhat-deploy/types'
import { AddressZero } from '@ethersproject/constants'
import assert from 'assert'

/**
 * This deploy function will deploy and configure LayerZero endpoint
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    assert(network.config.endpointId != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    const endpointV2Deployment = await deployments.deploy('EndpointV2', {
        from: deployer,
        args: [network.config.endpointId],
    })

    const sendUln302 = await deployments.deploy('SendUln302', {
        from: deployer,
        args: [endpointV2Deployment.address, 0, 0],
    })

    const receiveUln302 = await deployments.deploy('ReceiveUln302', {
        from: deployer,
        args: [endpointV2Deployment.address],
    })

    console.table({
        Network: network.name,
        EndpointV2: endpointV2Deployment.address,
        SendUln302: sendUln302.address,
        ReceiveUln302: receiveUln302.address,
    })
}

deploy.tags = ['Bootstrap', 'EndpointV2']

export default deploy
