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
        bsc: {
            eid: EndpointId.BSC_V2_MAINNET,
            url: 'https://404-beepboop.drpc.org',
            accounts: {
                mnemonic: MNEMONIC,
                initialIndex: 0,
            },
        },
        arbSepolia: {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            url: 'https://sepolia-rollup.arbitrum.io/rpc',
            accounts: {
                mnemonic: MNEMONIC,
                initialIndex: 0,
            },
        },
    },
}

export default config
