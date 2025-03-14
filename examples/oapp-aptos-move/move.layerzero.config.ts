import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'rewards',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: aptosContract,
            config: {
                delegate: 'c399601f4dfb57f699d38a13216cc43f0f1366132d2581e6889ff900e3b5225b',
                owner: 'c399601f4dfb57f699d38a13216cc43f0f1366132d2581e6889ff900e3b5225b',
            },
        },
    ],
    connections: [],
}

export default config
