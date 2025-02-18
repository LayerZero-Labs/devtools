import { formatEid } from '@layerzerolabs/devtools'
import { type DeployFunction } from 'hardhat-deploy/types'
import assert from 'assert'
import { createLogger, printRecord } from '@layerzerolabs/io-devtools'

/**
 * This deploy function will deploy and configure EndpointV2 and DefaultOApp
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
        args: [endpointV2.address, deployer],
    })

    const logger = createLogger(process.env.LZ_DEVTOOLS_ENABLE_DEPLOY_LOGGING ? 'info' : 'error')
    logger.info(
        printRecord({
            Network: `${network.name} (endpoint ${formatEid(network.config.eid)})`,
            DefaultOApp: defaultOAppDeployment.address,
        })
    )
}

deploy.tags = ['OApp', 'DefaultOApp']

export default deploy
