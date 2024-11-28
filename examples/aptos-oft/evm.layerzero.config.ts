import { EndpointId } from '@layerzerolabs/lz-definitions-v3'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_SANDBOX,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_SANDBOX,
    contractName: 'oft',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscContract,
        },
        {
            contract: aptosContract,
        },
    ],
    connections: [
        {
            from: bscContract,
            to: aptosContract,
        },
    ],
}

export default config
