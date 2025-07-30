import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import {
    IMetadata,
    IMetadataDvns,
    TwoWayConfig,
    defaultFetchMetadata,
    generateConnectionsConfig,
} from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const optimismContract: OmniPointHardhat = {
    eid: EndpointId.OPTSEP_V2_TESTNET,
    contractName: 'MyOFTMock', // Note: change this to 'MyOFT' or your production contract name
}

const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOFTMock', // Note: change this to 'MyOFT' or your production contract name
}

// TODO: Fill in your SimpleDVNMock address from deployments/arbitrum-testnet/SimpleDVNMock.json
const simpleDvnAddress = '' // e.g., '0xF1e41BaB1E9D09473fA048E09174EBA2669f7ea8'

// Create a custom fetchMetadata implementation to add SimpleDVNMock
const customFetchMetadata = async (): Promise<IMetadata> => {
    // Get the default metadata
    const defaultMetadata = await defaultFetchMetadata()

    // Validate that SimpleDVN address is provided
    if (!simpleDvnAddress) {
        throw new Error(
            'SimpleDVN address is required. Please set simpleDvnAddress variable with the address from deployments/arbitrum-testnet/SimpleDVNMock.json'
        )
    }

    // Extend the Arbitrum Sepolia DVNs with SimpleDVNMock
    const arbitrumSepoliaChain = defaultMetadata['arbitrum-sepolia-testnet']
    if (!arbitrumSepoliaChain) {
        throw new Error('Arbitrum Sepolia testnet not found in metadata')
    }

    const arbitrumSepoliaDVNsWithCustom: IMetadataDvns = {
        ...arbitrumSepoliaChain.dvns,
        [simpleDvnAddress]: {
            version: 2,
            canonicalName: 'SimpleDVNMock',
            id: 'simple-dvn-mock',
        },
    }

    return {
        ...defaultMetadata,
        'arbitrum-sepolia-testnet': {
            ...arbitrumSepoliaChain,
            dvns: arbitrumSepoliaDVNsWithCustom,
        },
    }
}

// To connect all the above chains to each other, we need the following pathways:
// Optimism <-> Arbitrum

// For this example's simplicity, we will use the same enforced options values for sending to all chains
// For production, you should ensure `gas` is set to the correct value through profiling the gas usage of calling OFT._lzReceive(...) on the destination chain
// To learn more, read https://docs.layerzero.network/v2/concepts/applications/oapp-standard#execution-options-and-enforced-settings
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

// With the config generator, pathways declared are automatically bidirectional
// i.e. if you declare A,B there's no need to declare B,A
const pathways: TwoWayConfig[] = [
    [
        optimismContract, // Chain A contract
        arbitrumContract, // Chain B contract
        [['LayerZero Labs'], [['SimpleDVNMock'], 1]], // [ requiredDVN[], [ optionalDVN[], threshold ] ] - SimpleDVNMock as optional DVN
        [1, 1], // [A to B confirmations, B to A confirmations]
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Chain A enforcedOptions, Chain B enforcedOptions
    ],
]

export default async function () {
    // Generate the connections config based on the pathways with custom metadata
    const connections = await generateConnectionsConfig(pathways, { fetchMetadata: customFetchMetadata })
    return {
        contracts: [{ contract: optimismContract }, { contract: arbitrumContract }],
        connections,
    }
}
