import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

enum MsgType {
    SEND = 1,
    SEND_AND_CALL = 2,
}

const bscTestnetContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyHyperLiquidOFT',
}

const hyperliquidTestnetContract: OmniPointHardhat = {
    eid: EndpointId.HYPERLIQUID_V2_TESTNET,
    contractName: 'MyHyperLiquidOFT',
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
