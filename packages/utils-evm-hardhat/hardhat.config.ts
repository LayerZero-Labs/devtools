import { EndpointId } from '@layerzerolabs/lz-definitions'
import 'hardhat-deploy'
import { HardhatUserConfig } from 'hardhat/types'

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        'ethereum-mainnet': {
            url: 'https://eth.llamarpc.com',
            saveDeployments: true,
            endpointId: EndpointId.ETHEREUM_MAINNET,
        },
        'ethereum-testnet': {
            url: 'https://eth-goerli.public.blastapi.io',
            endpointId: EndpointId.ETHEREUM_TESTNET,
        },
        'bsc-testnet': {
            url: 'https://bsc-testnet.publicnode.com',
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk',
            },
        },
    },
}

export default config
