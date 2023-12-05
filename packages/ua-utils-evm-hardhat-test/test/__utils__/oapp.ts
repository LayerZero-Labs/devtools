import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createNetworkEnvironmentFactory } from '@layerzerolabs/utils-evm-hardhat'
import deploy from '../../deploy/002_oapp'

export const deployOApp = async () => {
    const environmentFactory = createNetworkEnvironmentFactory()

    await deploy(await environmentFactory(EndpointId.ETHEREUM_MAINNET))
    await deploy(await environmentFactory(EndpointId.AVALANCHE_MAINNET))
}
