import { getDefaultRuntimeEnvironment } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { TASK_LZ_DEPLOY } from '@layerzerolabs/devtools-evm-hardhat'

export const ethEndpoint = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'Endpoint' }
export const avaxEndpoint = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'Endpoint' }
export const bscEndpoint = { eid: EndpointId.BSC_MAINNET, contractName: 'Endpoint' }

/**
 * Deploys the Endpoint contracts
 */
export const deployEndpoint = async (hre = getDefaultRuntimeEnvironment()) => {
    await hre.run(TASK_LZ_DEPLOY, {
        ci: true,
        tags: ['Endpoint'],
    })
}
