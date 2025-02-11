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
import '@matterlabs/hardhat-zksync-solc'
import '@matterlabs/hardhat-zksync-deploy'
import '@matterlabs/hardhat-zksync-verify'
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
        artifacts: 'artifacts',
        sources: './contracts', // Ensure this path points to your contracts
    },
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                eraVersion: '1.0.0', //optional. Compile contracts with EraVM compiler
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    zksolc: {
        version: '1.5.11', // Version of the zksolc compiler to use
        compilerSource: 'binary', // or 'docker' if you prefer
        settings: {
            optimizer: {
                enabled: true,
                mode: 'z',
            },
            libraries: {},
        },
    },
    networks: {
        // We need to allow unlimited size contracts for the hardhat network since
        // our test helper goes over the contract size limit
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        'abstract-testnet': {
            eid: EndpointId.ABSTRACT_V2_TESTNET,
            url: process.env.RPC_URL_ABSTRACT || 'https://api.testnet.abs.xyz',
            accounts,
            zksync: true, // This flag is crucial for zkSync networks
            ethNetwork: 'sepolia', // Use 'sepolia' to match the Ethereum network zkSync Sepolia is using
            verifyURL: 'https://api-explorer-verify.testnet.abs.xyz/contract_verification', // Adjusted API URL for zkSync Sepolia
        },
        'avalanche-testnet': {
            eid: EndpointId.AVALANCHE_V2_TESTNET,
            url: process.env.RPC_URL_FUJI || 'https://rpc.ankr.com/avalanche_fuji',
            accounts,
        },
        'zksync-testnet': {
            eid: EndpointId.ZKSYNCSEP_V2_TESTNET,
            url: process.env.RPC_URL_ZKSYNCSEP || 'https://sepolia.era.zksync.dev',
            accounts,
            zksync: true, // This flag is crucial for zkSync networks
            ethNetwork: 'sepolia', // Use 'sepolia' to match the Ethereum network zkSync Sepolia is using
            verifyURL: 'https://explorer.sepolia.era.zksync.dev/contract_verification', // Adjusted API URL for zkSync Sepolia
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

export default config
