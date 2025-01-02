import { EndpointId } from '@layerzerolabs/lz-definitions'

import { aptosConfig } from './OAppConfigAptos'
import { bscConfig } from './OAppConfigEVM'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'
// import './type-extension'

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'oft',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscContract,
            config: bscConfig.accountConfig,
        },
        {
            contract: aptosContract,
            config: aptosConfig.accountConfig,
        },
    ],
    connections: [
        {
            from: aptosContract,
            to: bscContract,
            config: aptosConfig.oappConfig,
        },
        {
            from: bscContract,
            to: aptosContract,
            config: bscConfig.oappConfig,
        },
    ],
}

export default config
