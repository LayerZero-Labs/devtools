import { EndpointId } from '@layerzerolabs/lz-definitions'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const baseContract: OmniPointHardhat = {
    eid: EndpointId.BASESEP_V2_TESTNET,
    contractName: 'OmniRead',
}

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'OmniRead',
}

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'OmniRead',
}

export default async function () {
    // note: pathways declared here are automatically bidirectional
    // if you declare A,B there's no need to declare B,A
    const connections = await generateConnectionsConfig([
        [
            baseContract, // Chain A contract
            sepoliaContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [1, 1], // [A to B confirmations, B to A confirmations]
            [undefined, undefined], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            arbitrumContract, // Chain A contract
            baseContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [1, 1], // [A to B confirmations, B to A confirmations]
            [undefined, undefined], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
        [
            sepoliaContract, // Chain A contract
            arbitrumContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [1, 1], // [A to B confirmations, B to A confirmations]
            [undefined, undefined], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
    ])

    return {
        contracts: [{ contract: baseContract }, { contract: sepoliaContract }, { contract: arbitrumContract }],
        connections,
    }
}
