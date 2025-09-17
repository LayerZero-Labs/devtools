import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const bscTestnetContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOFT',
}

const hyperliquidTestnetContract: OmniPointHardhat = {
    eid: EndpointId.HYPERLIQUID_V2_TESTNET,
    contractName: 'MyOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscTestnetContract,
            config: {
                owner: '',
                delegate: '',
            },
        },
        {
            contract: hyperliquidTestnetContract,
            config: {
                delegate: '',
                owner: '',
            },
        },
    ],
    connections: [
        {
            from: bscTestnetContract,
            to: hyperliquidTestnetContract,
        },
        {
            from: hyperliquidTestnetContract,
            to: bscTestnetContract,
        },
    ],
}

export default config
