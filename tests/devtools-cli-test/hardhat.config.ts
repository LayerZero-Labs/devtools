import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import type { HardhatUserConfig } from 'hardhat/types'

// These tasks are only for when you want to play with this setup
// using your own keyboard (using exposed networks)
import './tasks'
import { createTestNetworkConfigV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'

const mnemonic = process.env.MNEMONIC ?? ''

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    layerZero: {
        // Since we are deploying our own protocol contracts,
        // we'll skip the external deployment imports
        deploymentSourcePackages: [],
    },
    solidity: {
        version: '0.8.22',
    },
    networks: createTestNetworkConfigV2({ mnemonic, initialIndex: 40 }),
}

export default config
