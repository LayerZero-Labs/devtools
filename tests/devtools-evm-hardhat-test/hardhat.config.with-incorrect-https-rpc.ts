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
        ...baseConfig.networks,
        ethereum: {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: 'https://github.com', // URL that is not an rpc
            accounts: {
                mnemonic: MNEMONIC,
                initialIndex: 0,
            },
        },
    },
}

export default config
