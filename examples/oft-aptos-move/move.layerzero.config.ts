import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'oft',
}

const ethContract: OmniPointHardhat = {
    eid: EndpointId.ETHEREUM_V2_TESTNET,
    contractName: 'MyOFT',
}

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_TESTNET,
    contractName: 'MyOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscContract,
            config: {
                owner: '',
                delegate: '',
            },
        },
        {
            contract: ethContract,
            config: {
                owner: '',
                delegate: '',
            },
        },
        {
            contract: aptosContract,
            config: {
                delegate: '',
                owner: '',
            },
        },
    ],
    connections: [
        {
            from: aptosContract,
            to: ethContract,
        },
        {
            from: aptosContract,
            to: bscContract,
        },
        {
            from: bscContract,
            to: aptosContract,
        },
        {
            from: bscContract,
            to: solanaContract,
        },
        {
            from: ethContract,
            to: aptosContract,
        },
    ],
}

export default config
