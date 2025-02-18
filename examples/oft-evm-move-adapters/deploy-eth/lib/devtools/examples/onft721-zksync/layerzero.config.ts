import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppEdgeConfig, OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const abstractContract: OmniPointHardhat = {
    eid: EndpointId.ABSTRACT_V2_TESTNET,
    contractName: 'MyONFT721',
}

const fujiContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_TESTNET,
    contractName: 'MyONFT721',
}

const zksyncContract: OmniPointHardhat = {
    eid: EndpointId.ZKSYNCSEP_V2_TESTNET,
    contractName: 'MyONFT721',
}

const DEFAULT_EDGE_CONFIG: OAppEdgeConfig = {
    // Gas can be profiled and enforced based on your contract's needs
    enforcedOptions: [
        {
            msgType: 1,
            optionType: ExecutorOptionType.LZ_RECEIVE,
            gas: 100_000,
            value: 0,
        },
        {
            msgType: 2,
            optionType: ExecutorOptionType.LZ_RECEIVE,
            gas: 100_000,
            value: 0,
        },
        {
            msgType: 2,
            optionType: ExecutorOptionType.COMPOSE,
            index: 0,
            gas: 100_000,
            value: 0,
        },
    ],
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: fujiContract,
        },
        {
            contract: abstractContract,
        },
        {
            contract: zksyncContract,
        },
    ],
    connections: [
        {
            from: fujiContract,
            to: abstractContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: fujiContract,
            to: zksyncContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: abstractContract,
            to: fujiContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: abstractContract,
            to: zksyncContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: zksyncContract,
            to: abstractContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: zksyncContract,
            to: fujiContract,
            config: DEFAULT_EDGE_CONFIG,
        },
    ],
}

export default config
