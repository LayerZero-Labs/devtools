import { EndpointId } from '@layerzerolabs/lz-definitions'

interface CreateTestNetworkConfigOptions {
    mnemonic?: string
    initialIndex?: number
}

export const createTestNetworkConfigV1 = ({
    mnemonic = process.env.MNEMONIC ?? '',
    initialIndex = 0,
}: CreateTestNetworkConfigOptions) => ({
    vengaboys: {
        eid: EndpointId.ETHEREUM_MAINNET,
        // Containerized setup defines these environment variables
        // to point the networks to the internal ones
        //
        // If these are not specified, exposed networks are used
        //
        // See root README.md for usage with exposed network
        url: process.env.NETWORK_URL_VENGABOYS ?? 'http://localhost:10001',
        accounts: {
            mnemonic,
            initialIndex,
        },
    },
    britney: {
        eid: EndpointId.AVALANCHE_MAINNET,
        // Containerized setup defines these environment variables
        // to point the networks to the internal ones
        //
        // If these are not specified, exposed networks are used
        //
        // See root README.md for usage with exposed network
        url: process.env.NETWORK_URL_BRITNEY ?? 'http://localhost:10002',
        accounts: {
            mnemonic,
            initialIndex,
        },
    },
    tango: {
        eid: EndpointId.BSC_MAINNET,
        // Containerized setup defines these environment variables
        // to point the networks to the internal ones
        //
        // If these are not specified, exposed networks are used
        //
        // See root README.md for usage with exposed network
        url: process.env.NETWORK_URL_TANGO ?? 'http://localhost:10003',
        accounts: {
            mnemonic,
            initialIndex,
        },
    },
})

export const createTestNetworkConfigV2 = ({
    mnemonic = process.env.MNEMONIC ?? '',
    initialIndex = 0,
}: CreateTestNetworkConfigOptions) => ({
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
            mnemonic,
            initialIndex,
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
            mnemonic,
            initialIndex,
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
            mnemonic,
            initialIndex,
        },
    },
})
