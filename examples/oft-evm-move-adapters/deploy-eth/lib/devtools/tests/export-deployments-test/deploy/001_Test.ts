import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments }) => {
    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    await deployments.deploy('Test', {
        from: deployer,
    })
}

deploy.tags = ['Test']

export default deploy
