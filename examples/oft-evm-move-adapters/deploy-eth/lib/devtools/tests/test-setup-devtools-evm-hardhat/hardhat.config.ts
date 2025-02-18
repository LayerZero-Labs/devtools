import 'hardhat-deploy'
import type { HardhatUserConfig } from 'hardhat/types'

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.22',
    },
}

export default config
