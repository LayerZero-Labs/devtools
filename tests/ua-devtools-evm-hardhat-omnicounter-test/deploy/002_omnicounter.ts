import { formatEid } from '@layerzerolabs/devtools'
import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'

/**
 * This deploy function will deploy and configure LayerZero OmniCounter
 *
 * @param env `HardhatRuntimeEnvironment`
 */
const deploy: DeployFunction = async ({ getUnnamedAccounts, deployments, network }) => {
    assert(network.config.eid != null, `Missing endpoint ID for network ${network.name}`)

    const [deployer] = await getUnnamedAccounts()
    assert(deployer, 'Missing deployer')

    await deployments.delete('OmniCounter')
    const endpointV2 = await deployments.get('EndpointV2')
    const omniCounterDeployment = await deployments.deploy('OmniCounter', {
        contract: 'contracts/OmniCounter.sol:OmniCounter',
        from: deployer,
        args: [endpointV2.address, deployer],
    })

    console.table({
        Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
        OmniCounter: omniCounterDeployment.address,
    })
}

deploy.tags = ['OmniCounter']

export default deploy
