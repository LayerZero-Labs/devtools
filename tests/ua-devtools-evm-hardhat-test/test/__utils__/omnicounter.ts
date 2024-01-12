import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'

/**
 * Deploys the OmniCounter contracts
 *
 * @param {boolean} [writeToFileSystem] Write the deployment files to filesystem. Keep this `false` for tests to avoid race conditions
 */
export const deployOmniCounter = async (writeToFileSystem: boolean = false) => {
    const environmentFactory = createGetHreByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_V2_MAINNET)

    await Promise.all([
        eth.deployments.run('OmniCounter', { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
        avax.deployments.run('OmniCounter', { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
    ])
}
