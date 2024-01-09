import 'hardhat-deploy'
import '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { HardhatUserConfig } from 'hardhat/types'

const MNEMONIC = process.env.MNEMONIC ?? ''

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
            accounts: {
                mnemonic: MNEMONIC,
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
            },
        },
    },
}

export default config
