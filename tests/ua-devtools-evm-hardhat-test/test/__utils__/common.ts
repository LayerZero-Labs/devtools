import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

export const clearDeployments = async (hre: HardhatRuntimeEnvironment) => {
    const deployments = await hre.deployments.all()
    const deploymentNames = Object.keys(deployments)

    await Promise.all(deploymentNames.map((name) => hre.deployments.delete(name)))
}

export const cleanAllDeployments = async () => {
    const environmentFactory = createGetHreByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_V2_MAINNET)
    const bsc = await environmentFactory(EndpointId.BSC_V2_MAINNET)

    await Promise.all([clearDeployments(eth), clearDeployments(avax), clearDeployments(bsc)])
}
