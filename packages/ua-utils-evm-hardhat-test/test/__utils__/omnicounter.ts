import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createGetHREByEid } from '@layerzerolabs/utils-evm-hardhat'

export const deployOmniCounter = async () => {
    const environmentFactory = createGetHREByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([
        eth.deployments.run('OmniCounter', { writeDeploymentsToFiles: true }),
        avax.deployments.run('OmniCounter', { writeDeploymentsToFiles: true }),
    ])
}

export const deployOmniCounterFixture = async () => {
    const environmentFactory = createGetHREByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([eth.deployments.fixture('OmniCounter'), avax.deployments.fixture('OmniCounter')])
}
