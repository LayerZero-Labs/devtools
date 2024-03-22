import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import { createTestNetworkConfigV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import type { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC ?? ''

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.22',
    },
    networks: createTestNetworkConfigV2({ mnemonic: MNEMONIC, initialIndex: 0 }),
}

export default config
