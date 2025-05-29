import { EndpointId } from '@layerzerolabs/lz-definitions'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_TESTNET,
    contractName: 'LzApp',
}

const arbSepoliaContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOApp',
}

const pathways: TwoWayConfig[] = [
    [sepoliaContract, arbSepoliaContract, [['LayerZero Labs'], []], [1, 1], [undefined, undefined]],
]

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [{ contract: sepoliaContract }, { contract: arbSepoliaContract }],
        connections,
    }
}
