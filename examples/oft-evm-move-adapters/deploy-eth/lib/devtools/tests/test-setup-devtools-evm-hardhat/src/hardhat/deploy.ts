import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

/**
 * Deploys the OApp contracts
 *
 * @param {boolean} [writeToFileSystem] Write the deployment files to filesystem. Keep this `false` for tests to avoid race conditions
 */
export const deployContract = async (tag: string, writeToFileSystem: boolean = false) => {
    const environmentFactory = createGetHreByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_V2_MAINNET)
    const bsc = await environmentFactory(EndpointId.BSC_V2_MAINNET)

    await Promise.all([
        eth.deployments.run(tag, { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
        avax.deployments.run(tag, { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
        bsc.deployments.run(tag, { writeDeploymentsToFiles: writeToFileSystem, resetMemory: false }),
    ])
}
