import 'hardhat-deploy'
import assert from 'assert'
import { withLayerZeroArtifacts } from '@layerzerolabs/utils-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { HardhatUserConfig } from 'hardhat/types'
import '@layerzerolabs/ua-utils-evm-hardhat/tasks'

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

export default withLayerZeroArtifacts('@layerzerolabs/lz-evm-sdk-v2')(config)
