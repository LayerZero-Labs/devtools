import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { HardhatUserConfig } from 'hardhat/types'

// These tasks are only for when you want to play with this setup
// using your own keyboard (using exposed networks)
import './tasks'

import account from './account.config'

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
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            // Containerized setup defines these environment variables
            // to point the networks to the internal ones
            //
            // If these are not specified, exposed networks are used
            //
            // See root README.md for usage with exposed network
            url: process.env.NETWORK_URL_VENGABOYS ?? 'http://localhost:10001',
            accounts: account,
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
            accounts: account,
        },
    },
}

export default config
