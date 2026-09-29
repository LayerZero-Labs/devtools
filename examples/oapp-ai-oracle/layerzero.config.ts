import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'EvidenceOracle',
}

const bscTestnetContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'EvidenceOracle',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        { contract: sepoliaContract },
        { contract: bscTestnetContract },
    ],
    connections: [
        {
            from: sepoliaContract,
            to: bscTestnetContract,
        },
        {
            from: bscTestnetContract,
            to: sepoliaContract,
        },
    ],
}

export default config
