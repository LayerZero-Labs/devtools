import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import { withLayerZeroArtifacts } from '@layerzerolabs/utils-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = 'test test test test test test test test test test test test'

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.19',
    },
    networks: {
        hardhat: {
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
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
