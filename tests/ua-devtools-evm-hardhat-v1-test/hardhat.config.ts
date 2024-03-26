import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import { createTestNetworkConfigV1 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import type { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC ?? ''

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    layerZero: {
        // Since we are deploying our own protocol contracts,
        // we'll skip the external deployment imports
        deploymentSourcePackages: [],
        // Since we are working with V1 only here, we'll only include the V1 SDKs
        artifactSourcePackages: ['@layerzerolabs/lz-evm-sdk-v1', '@layerzerolabs/test-devtools-evm-hardhat'],
    },
    solidity: {
        version: '0.8.22',
    },
    networks: createTestNetworkConfigV1({ mnemonic: MNEMONIC, initialIndex: 20 }),
}

export default config
