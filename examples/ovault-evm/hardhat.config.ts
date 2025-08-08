// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables
import 'dotenv/config'

import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import './type-extensions'
import './tasks/sendOFT'
import './tasks/sendOVaultComposer'

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic
const MNEMONIC = process.env.MNEMONIC

// If you prefer to be authenticated using a private key, set a PRIVATE_KEY environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
      ? [PRIVATE_KEY]
      : undefined

if (accounts == null) {
    console.warn(
        'Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.'
    )
}

const config: HardhatUserConfig = {
    paths: {
        cache: 'cache/hardhat',
    },
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
        optimism: {
            eid: EndpointId.OPTIMISM_V2_MAINNET.valueOf(),
            url: process.env.RPC_URL_OPTIMISM || 'https://optimism.gateway.tenderly.co',
            accounts,
            ovault: {
                isHubChain: false, // Optimism as spoke chain
                assetToken: {
                    name: 'MyAssetOFT',
                    symbol: 'ASSET',
                },
                shareToken: {
                    name: 'MyShareOFT',
                    symbol: 'SHARE',
                },
            },
        },
        base: {
            eid: EndpointId.BASE_V2_MAINNET.valueOf(),
            url: process.env.RPC_URL_BASE || 'https://base.gateway.tenderly.co',
            accounts,
            ovault: {
                isHubChain: true, // Hub chain with vault
                assetToken: {
                    name: 'MyAssetOFT',
                    symbol: 'ASSET',
                },
                shareToken: {
                    name: 'MyShareOFT',
                    symbol: 'SHARE',
                },
            },
        },
        arbitrum: {
            eid: EndpointId.ARBITRUM_V2_MAINNET.valueOf(),
            url: process.env.RPC_URL_ARB || 'https://arbitrum.gateway.tenderly.co',
            accounts,
            ovault: {
                isHubChain: false, // Spoke chain with both asset and share OFTs
                assetToken: {
                    name: 'MyAssetOFT',
                    symbol: 'ASSET',
                },
                shareToken: {
                    name: 'MyShareOFT',
                    symbol: 'SHARE',
                },
            },
        },
        // Example: Share OFT only network (uncomment to use)
        // polygon: {
        //     eid: EndpointId.POLYGON_V2_MAINNET.valueOf(),
        //     url: process.env.RPC_URL_POLYGON || 'https://polygon.gateway.tenderly.co',
        //     accounts,
        //     ovault: {
        //         isHubChain: false, // Spoke chain with share OFT only
        //         shareToken: {
        //             name: 'MyShareOFT',
        //             symbol: 'SHARE',
        //         },
        //     },
        // },
        hardhat: {
            // Need this for testing because TestHelperOz5.sol is exceeding the compiled contract size limit
            allowUnlimitedContractSize: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

export default config
