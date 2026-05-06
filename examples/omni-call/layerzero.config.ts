import { EndpointId } from '@layerzerolabs/lz-definitions'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'OmniCall',
}

const baseContract: OmniPointHardhat = {
    eid: EndpointId.BASESEP_V2_TESTNET,
    contractName: 'OmniCall',
}

export default async function () {
    // note: pathways declared here are automatically bidirectional
    // if you declare A,B there's no need to declare B,A
    // Replace <SECONDARY_DVN> with a non-LayerZero-Labs DVN provider for this pathway.
    // See https://docs.layerzero.network/v2/deployments/dvn-addresses for available providers.
    // [1, 1] confirmations is fine for local dev; production typically uses 15+ on each side.
    const connections = await generateConnectionsConfig([
        [arbitrumContract, baseContract, [['LayerZero Labs', '<SECONDARY_DVN>'], []], [1, 1], [undefined, undefined]],
    ])

    return {
        contracts: [{ contract: arbitrumContract }, { contract: baseContract }],
        connections,
    }
}
