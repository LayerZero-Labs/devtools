import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { HardhatUserConfig } from 'hardhat/types'

// These tasks are only for when you want to play with this setup
// using your own keyboard (using exposed networks)
import './tasks'

const MNEMONIC = process.env.MNEMONIC ?? ''

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    layerZero: {
        // Since we are deploying our own protocol contracts,
        // we'll skip the external deployment imports
        deploymentSourcePackages: [],
    },
    solidity: {
        version: '0.8.22',
    },
    networks: {
        vengaboys: {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            // Containerized setup defines these environment variables
            // to point the networks to the internal ones
            //
            // If these are not specified, exposed networks are used
            //
            // See root README.md for usage with exposed network
            url: process.env.NETWORK_URL_VENGABOYS ?? 'http://localhost:10001',
            accounts: {
                mnemonic: MNEMONIC,
                // We'll offset the initial index for the accounts by 10
                // for every test project so that the project can use 10 accounts
                // without getting any nonce race conditions with other test runs
                initialIndex: 10,
            },
        },
        britney: {
            eid: EndpointId.AVALANCHE_V2_MAINNET,
            // Containerized setup defines these environment variables
            // to point the networks to the internal ones
            //
            // If these are not specified, exposed networks are used
            //
            // See root README.md for usage with exposed network
            url: process.env.NETWORK_URL_BRITNEY ?? 'http://localhost:10002',
            accounts: {
                mnemonic: MNEMONIC,
                // We'll offset the initial index for the accounts by 10
                // for every test project so that the project can use 10 accounts
                // without getting any nonce race conditions with other test runs
                initialIndex: 10,
            },
        },
        tango: {
            eid: EndpointId.BSC_V2_MAINNET,
            // Containerized setup defines these environment variables
            // to point the networks to the internal ones
            //
            // If these are not specified, exposed networks are used
            //
            // See root README.md for usage with exposed network
            url: process.env.NETWORK_URL_TANGO ?? 'http://localhost:10003',
            accounts: {
                mnemonic: MNEMONIC,
                // We'll offset the initial index for the accounts by 10
                // for every test project so that the project can use 10 accounts
                // without getting any nonce race conditions with other test runs
                initialIndex: 10,
            },
        },
    },
}

export default config
