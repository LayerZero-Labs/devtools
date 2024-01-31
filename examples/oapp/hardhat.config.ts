import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

const MNEMONIC = process.env.MNEMONIC ?? ''

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        sepolia: {
            eid: EndpointId.ETHEREUM_V2_TESTNET,
            url: 'https://rpc.sepolia.org/',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        fuji: {
            eid: EndpointId.AVALANCHE_V2_TESTNET,
            url: 'https://api.avax-test.network/',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        mumbai: {
            eid: EndpointId.POLYGON_V2_TESTNET,
            url: 'https://rpc-mumbai.matic.today',
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

export default config
