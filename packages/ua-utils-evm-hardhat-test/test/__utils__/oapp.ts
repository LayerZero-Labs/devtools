import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createNetworkEnvironmentFactory } from '@layerzerolabs/utils-evm-hardhat'

export const deployOApp = async () => {
    const environmentFactory = createNetworkEnvironmentFactory()
    const eth = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_MAINNET)

    await Promise.all([eth.deployments.fixture('OApp'), avax.deployments.fixture('OApp')])
}
