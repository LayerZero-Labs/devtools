import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyOFT',
}

const fujiContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_TESTNET,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: 50008 as EndpointId,
    contractName: 'oft',
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
            contract: aptosContract,
        },
    ],
    connections: [
        {
            from: aptosContract,
            to: sepoliaContract,
        },
        {
            from: fujiContract,
            to: aptosContract,
        },
        {
            from: aptosContract,
            to: fujiContract,
        },
        {
            from: sepoliaContract,
            to: fujiContract,
        },
    ],
}

export default config
