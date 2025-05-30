import { EndpointId } from '@layerzerolabs/lz-definitions'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'OmniCall',
}

const fujiContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_TESTNET,
    contractName: 'OmniCall',
}

const amoyContract: OmniPointHardhat = {
    eid: EndpointId.AMOY_V2_TESTNET,
    contractName: 'OmniCall',
}

export default async function () {
    // note: pathways declared here are automatically bidirectional
    // if you declare A,B there's no need to declare B,A
    const connections = await generateConnectionsConfig([
        [
            sepoliaContract, // Chain A contract
            fujiContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [1, 1], // [A to B confirmations, B to A confirmations]
            [undefined, undefined], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            sepoliaContract, // Chain A contract
            amoyContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [1, 1], // [A to B confirmations, B to A confirmations]
            [undefined, undefined], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            fujiContract, // Chain A contract
            amoyContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [1, 1], // [A to B confirmations, B to A confirmations]
            [undefined, undefined], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
    ])

    return {
        contracts: [{ contract: sepoliaContract }, { contract: fujiContract }, { contract: amoyContract }],
        connections,
    }
}
