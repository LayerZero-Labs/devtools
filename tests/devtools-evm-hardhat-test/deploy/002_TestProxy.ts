import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

/**
 * This deploy function will deploy and configure the TestProxy contract
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    deployments.delete('TestProxy')
    deployments.delete('TestProxy_Implementation')
    deployments.delete('TestProxy_Proxy')
    deployments.delete('DefaultProxyAdmin')
    const testProxyDeployment = await deployments.deploy('TestProxy', {
        from: deployer,
        proxy: {
            owner: deployer,
            proxyContract: 'OptimizedTransparentProxy',
            execute: {
                init: {
                    methodName: 'initialize',
                    args: [],
                },
            },
        },
    })

    console.table({
        Network: `${network.name}`,
        TestProxy: testProxyDeployment.address,
    })
}

deploy.tags = ['TestProxy']

export default deploy
