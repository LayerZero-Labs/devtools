import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

/**
 * This deploy function will deploy and configure the Thrower contract
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    await deployments.delete('Thrower')
    const throwerDeployment = await deployments.deploy('Thrower', {
        from: deployer,
    })

    console.table({
        Network: `${network.name}`,
        Thrower: throwerDeployment.address,
    })
}

deploy.tags = ['Thrower']

export default deploy
