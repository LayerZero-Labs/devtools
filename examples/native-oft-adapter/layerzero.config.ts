import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

/**
 *  WARNING: ONLY 1 NativeOFTAdapter should exist for a given global mesh.
 */
const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyNativeOFTAdapter',
}

const fujiContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_TESTNET,
    contractName: 'MyOFT',
}

const amoyContract: OmniPointHardhat = {
    eid: EndpointId.AMOY_V2_TESTNET,
    contractName: 'MyOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: fujiContract,
        },
        {
            contract: sepoliaContract,
        },
        {
            contract: amoyContract,
        },
    ],
    connections: [
        {
            from: fujiContract,
            to: sepoliaContract,
        },
        {
            from: fujiContract,
            to: amoyContract,
        },
        {
            from: sepoliaContract,
            to: fujiContract,
        },
        {
            from: sepoliaContract,
            to: amoyContract,
        },
        {
            from: amoyContract,
            to: sepoliaContract,
        },
        {
            from: amoyContract,
            to: fujiContract,
        },
    ],
}

export default config
