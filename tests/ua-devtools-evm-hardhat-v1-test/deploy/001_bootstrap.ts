import { formatEid } from '@layerzerolabs/devtools'
import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

/**
 * This `deploy` function will deploy and configure LayerZero Endpoint (V1)
 *
 * @param {HardhatRuntimeEnvironment} env
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }: HardhatRuntimeEnvironment) => {
    assert(network.config.eid != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    await deployments.delete('Endpoint')
    const endpointDeployment = await deployments.deploy('Endpoint', {
        from: deployer,
        args: [network.config.eid],
    })

    console.table({
        Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
        EndpointV2: endpointDeployment.address,
    })
}

deploy.tags = ['Bootstrap', 'Endpoint']

export default deploy
