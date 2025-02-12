import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: {
                eid: EndpointId.INITIA_V2_TESTNET,
                contractName: 'TestOFT',
            },
            config: {
                delegate: '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6',
                owner: '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6',
            },
        },
    ],
    connections: [],
}

export default config 