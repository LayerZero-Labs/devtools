import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'

export const deployOmniCounter = async () => {
    const environmentFactory = createGetHreByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_V2_MAINNET)

    await Promise.all([
        eth.deployments.run('OmniCounter', { resetMemory: false }),
        avax.deployments.run('OmniCounter', { resetMemory: false }),
    ])
}
