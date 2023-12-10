import { formatEid } from '@layerzerolabs/utils'
import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

/**
 * This deploy function will deploy and configure LayerZero endpoint
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    assert(network.config.eid != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    await deployments.delete('DefaultOApp')
    const endpointV2 = await deployments.get('EndpointV2')
    const defaultOAppDeployment = await deployments.deploy('DefaultOApp', {
        from: deployer,
        args: [endpointV2.address],
    })

    console.table({
        Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
        DefaultOApp: defaultOAppDeployment.address,
    })
}

deploy.tags = ['OApp', 'DefaultOApp']
deploy.dependencies = ['Bootstrap']

export default deploy
