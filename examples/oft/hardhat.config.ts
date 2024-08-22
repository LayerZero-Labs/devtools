// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables
import 'dotenv/config'

import assert from 'assert'

import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

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
            eid: EndpointId.SEPOLIA_V2_TESTNET,
            url: process.env.RPC_URL_SEPOLIA || 'https://rpc.sepolia.org/',
            accounts,
            // safeConfig: { // Invalid safe config for testing
            //     safeAddress: '0x7eD1E469fCb3EE19C0366D829e291451bE638E59',
            //     safeUrl: 'https://safe-transaction-sepolia.safe.global',
            // },
        },
        'avalanche-testnet': {
            eid: EndpointId.AVALANCHE_V2_TESTNET,
            url: process.env.RPC_URL_FUJI || 'https://rpc.ankr.com/avalanche_fuji',
            accounts,
        },
        'amoy-testnet': {
            eid: EndpointId.AMOY_V2_TESTNET,
            url: process.env.RPC_URL_AMOY || 'https://polygon-amoy-bor-rpc.publicnode.com',
            accounts,
        },
        'base-mainnet': {
            eid: EndpointId.BASE_V2_MAINNET,
            url: process.env.RPC_URL_BASE_MAINNET || 'https://base.drpc.org',
            accounts,
            safeConfig: {
                safeAddress: '0x28937ca4873f7289Ebea0708c4E42b24835eCfF0',
                safeUrl: 'https://safe-transaction-base.safe.global/',
            },
        },
        'ethereum-mainnet': {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: process.env.RPC_URL_ETHEREUM_MAINNET || 'https://rpc.ankr.com/eth',
            accounts,
            safeConfig: {
                safeAddress: '0xCDa8e3ADD00c95E5035617F970096118Ca2F4C92',
                safeUrl: 'https://safe-transaction-mainnet.safe.global/',
            },
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

// TODO this will only work if the safe url is always one of the supported networks here https://docs.safe.global/core-api/transaction-service-supported-networks
// which seems to be the case for ZROClaim at least
const validateSafeConfig = async (config: any): Promise<boolean> => {
    assert(config.safeAddress != null, 'Missing safeAddress')
    assert(config.safeUrl != null, 'Missing safeUrl')

    // Construct the API URL to query the Safe's balance
    const apiUrl = `${config.safeUrl}/api/v1/safes/${config.safeAddress}/balances/`
    // const apiUrl = `${config.safeUrl}/api/v1/safes/${config.safeAddress}/`; // TODO or should we use this general info api endpoint

    try {
        // Make the API request to check the Safe's balance
        const response = await fetch(apiUrl)

        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`Failed to fetch Safe balance: ${response.statusText}`)
        }

        return true
    } catch (error) {
        if (error instanceof Error) {
            console.error('Validation failed:', error.message)
        } else {
            // Handle other types of errors (if any)
            console.error('An unknown error occurred')
        }

        return false
    }
}

async function validateNetworkSafeConfigs(config: HardhatUserConfig) {
    const networkNames = Object.keys(config.networks || {})
    for (const networkName of networkNames) {
        const networkConfig = config.networks?.[networkName]
        if (networkConfig && 'safeConfig' in networkConfig) {
            const isValid = await validateSafeConfig(networkConfig.safeConfig)
            if (!isValid) {
                throw new Error(`Safe config validation failed for network: ${networkName}`)
            }
        }
    }
}

// Run the validation before exporting the config TODO or maybe this should only be done when the task that calls safeConfig is run?
;(async () => {
    await validateNetworkSafeConfigs(config)
})().catch((error) => {
    console.error(error)
    process.exit(1)
})

export default config
