import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'

import type { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_TESTNET,
    contractName: 'MyEndpointV1OFTV2Mock',
}

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_TESTNET,
    address: '',
}

const SOLANA_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    { msgType: 1, optionType: ExecutorOptionType.LZ_RECEIVE, gas: 200000 },
    { msgType: 2, optionType: ExecutorOptionType.LZ_RECEIVE, gas: 200000 },
]

const pathways: TwoWayConfig[] = [
    [sepoliaContract, solanaContract, [['LayerZero Labs'], []], [15, 32], [undefined, SOLANA_ENFORCED_OPTIONS]],
]

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [{ contract: sepoliaContract }, { contract: solanaContract }],
        connections,
    }
}
