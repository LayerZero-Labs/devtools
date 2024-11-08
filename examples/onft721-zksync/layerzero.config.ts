import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppEdgeConfig, OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const abstractContract: OmniPointHardhat = {
    eid: EndpointId.ABSTRACT_V2_TESTNET,
    contractName: 'MyONFT721',
}

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyONFT721',
}

const zksyncContract: OmniPointHardhat = {
    eid: EndpointId.ZKSYNCSEP_V2_TESTNET,
    contractName: 'MyONFT721',
}

const DEFAULT_EDGE_CONFIG: OAppEdgeConfig = {
    enforcedOptions: [
        {
            msgType: 1,
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
            contract: abstractContract,
        },
        {
            contract: sepoliaContract,
        },
        {
            contract: zksyncContract,
        },
    ],
    connections: [
        {
            from: abstractContract,
            to: sepoliaContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: abstractContract,
            to: zksyncContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: sepoliaContract,
            to: abstractContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: sepoliaContract,
            to: zksyncContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: zksyncContract,
            to: sepoliaContract,
            config: DEFAULT_EDGE_CONFIG,
        },
        {
            from: zksyncContract,
            to: abstractContract,
            config: DEFAULT_EDGE_CONFIG,
        },
    ],
}

export default config
