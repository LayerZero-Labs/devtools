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
import { extendConfig } from 'hardhat/config'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

// Import LayerZero DevTools functions
import { withLayerZeroArtifacts, withLayerZeroDeployments } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

import '@layerzerolabs/devtools-evm-hardhat/type-extensions'
import '@layerzerolabs/devtools-evm-hardhat/tasks'
import '@layerzerolabs/ua-devtools-evm-hardhat/tasks'

import './tasks/sendV1Message.ts'
import './tasks/sendV2Message.ts'
import './tasks/index.ts'

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
        'sepolia-testnet': {
            eid: EndpointId.SEPOLIA_TESTNET,
            url: process.env.RPC_URL_SEPOLIA || 'https://sepolia.gateway.tenderly.co',
            accounts,
        },
        'arbsep-testnet': {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            url: process.env.RPC_URL_ARBSEP || 'https://sepolia-rollup.arbitrum.io/rpc',
            accounts,
        },
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
    external: {
        deployments: {},
    },
}

extendConfig((config, userConfig) => {
    // Extract LayerZero config from userConfig
    const layerZero = userConfig.layerZero

    // Define artifact source packages, including V1 and V2
    const artifactSourcePackages = layerZero?.artifactSourcePackages ?? [
        '@layerzerolabs/lz-evm-sdk-v1', // Added V1 SDK
        '@layerzerolabs/lz-evm-sdk-v2',
        '@layerzerolabs/test-devtools-evm-hardhat',
    ]

    // Define deployment source packages, including V1 and V2
    const deploymentSourcePackages = layerZero?.deploymentSourcePackages ?? [
        '@layerzerolabs/lz-evm-sdk-v1', // Added V1 SDK
        '@layerzerolabs/lz-evm-sdk-v2',
    ]

    // Create config extenders for artifacts and deployments
    const withArtifacts = withLayerZeroArtifacts(...artifactSourcePackages)
    const withDeployments = withLayerZeroDeployments(...deploymentSourcePackages)

    // Apply artifact and deployment configurations
    const { external } = withArtifacts(withDeployments(userConfig)) as { external: unknown }

    // Merge external deployments if available
    if (external != null) {
        Object.assign(config, { external })
    }
})

export default config
