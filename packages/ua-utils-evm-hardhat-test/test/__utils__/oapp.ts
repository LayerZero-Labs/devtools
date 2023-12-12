import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createNetworkEnvironmentFactory } from '@layerzerolabs/utils-evm-hardhat'

export const deployOApp = async () => {
    const environmentFactory = createNetworkEnvironmentFactory()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([
        eth.deployments.run('OApp', { writeDeploymentsToFiles: true }),
        avax.deployments.run('OApp', { writeDeploymentsToFiles: true }),
    ])
}

export const deployOAppFixture = async () => {
    const environmentFactory = createNetworkEnvironmentFactory()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([eth.deployments.fixture('OApp'), avax.deployments.fixture('OApp')])
}
