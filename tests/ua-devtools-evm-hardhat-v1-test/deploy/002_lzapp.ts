import { formatEid } from '@layerzerolabs/devtools'
import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

/**
 * This deploy function will deploy DefaultLzApp
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    assert(network.config.eid != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    await deployments.delete('DefaultLzApp')
    const endpointV2 = await deployments.get('Endpoint')
    const defaultLzAppDeployment = await deployments.deploy('DefaultLzApp', {
        from: deployer,
        args: [endpointV2.address, deployer],
    })

    console.table({
        Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
        DefaultLzApp: defaultLzAppDeployment.address,
    })
}

deploy.tags = ['LzApp', 'DefaultLzApp']

export default deploy
