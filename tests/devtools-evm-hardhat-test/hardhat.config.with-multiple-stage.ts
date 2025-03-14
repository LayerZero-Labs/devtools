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
            url: 'https://bsc-rpc.publicnode.com',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        arbSepolia: {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            url: 'https://sepolia-rollup.arbitrum.io/rpc',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        'ethereum-sandbox-local': {
            eid: EndpointId.ETHEREUM_V2_SANDBOX,
            isLocalEid: true,
            url: 'http://localhost:8501',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
    },
}

export default config
