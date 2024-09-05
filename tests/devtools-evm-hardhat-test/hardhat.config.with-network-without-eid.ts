import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import type { HardhatUserConfig } from 'hardhat/types'

import { default as baseConfig } from './hardhat.config'

const MNEMONIC = process.env.MNEMONIC ?? ''

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    networks: {
        localhost: {
            // eid is intentionally not defined, as networks without eid should not be validated
            url: 'https://localhost:8080',
            accounts: {
                mnemonic: MNEMONIC,
                initialIndex: 0,
            },
        },
    },
}

export default config
