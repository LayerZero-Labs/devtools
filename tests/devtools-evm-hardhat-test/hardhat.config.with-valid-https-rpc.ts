import 'hardhat-deploy'
import { EndpointId } from '@layerzerolabs/lz-definitions'
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
        arbitrum: {
            eid: EndpointId.ARBITRUM_V2_MAINNET,
            url: 'https://arbitrum-one-rpc.publicnode.com',
            accounts: {
                mnemonic: MNEMONIC,
                initialIndex: 0,
            },
        },
    },
}

export default config
