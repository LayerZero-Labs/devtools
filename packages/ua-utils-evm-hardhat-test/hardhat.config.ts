import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import assert from 'assert'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC
assert(MNEMONIC, `Missing MNEMONIC environment variable`)

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.22',
    },
    networks: {
        vengaboys: {
            eid: EndpointId.ETHEREUM_MAINNET,
            url: 'http://network-vengaboys:8545',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        britney: {
            eid: EndpointId.AVALANCHE_MAINNET,
            url: 'http://network-britney:8545',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
    },
}

export default config
