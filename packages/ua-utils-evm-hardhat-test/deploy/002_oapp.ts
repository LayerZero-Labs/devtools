import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

/**
 * This deploy function will deploy and configure LayerZero endpoint
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    const defaultOAppDeployment = await deployments.deploy('DefaultOApp', {
        from: deployer,
    })

    console.table({
        Network: network.name,
        DefaultOApp: defaultOAppDeployment.address,
    })
}

deploy.tags = ['OApp', 'DefaultOApp']
deploy.dependencies = ['Bootstrap']

export default deploy
