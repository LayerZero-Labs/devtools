import { getDefaultRuntimeEnvironment } from '@layerzerolabs/devtools-evm-hardhat'
import { TASK_LZ_DEPLOY } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export const ethLzApp = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DefaultLzApp' }
export const avaxLzApp = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DefaultLzApp' }
export const bscLzApp = { eid: EndpointId.BSC_MAINNET, contractName: 'DefaultLzApp' }

/**
 * Deploys the DefaultLzApp contracts
 */
export const deployLzApp = async (hre = getDefaultRuntimeEnvironment()) => {
    await hre.run(TASK_LZ_DEPLOY, {
        ci: true,
        tags: ['DefaultLzApp'],
    })
}
