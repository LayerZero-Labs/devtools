import { EndpointId } from '@layerzerolabs/lz-definitions'
import 'hardhat-deploy'
import { HardhatUserConfig } from 'hardhat/types'

// We import the locally defined tasks
import './src/tasks'

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        'ethereum-mainnet': {
            url: 'no:///way',
            saveDeployments: false,
            eid: EndpointId.ETHEREUM_V2_MAINNET,
        },
        'ethereum-testnet': {
            url: 'no:///way',
            saveDeployments: false,
            eid: EndpointId.ETHEREUM_TESTNET,
        },
        'bsc-testnet': {
            url: 'no:///way',
            saveDeployments: false,
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk',
            },
        },
    },
}

export default config
