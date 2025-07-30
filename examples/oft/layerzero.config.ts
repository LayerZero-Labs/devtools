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

// TODO: Fill in your SimpleDVNMock addresses from deployment files
const simpleDvnAddressOptimism = '0x2F5e9dF13AF5A94a0b5f80C228e398928B11ee36' // from deployments/optimism-testnet/SimpleDVNMock.json
const simpleDvnAddressArbitrum = '0xf305B0C5Aa7150F4ce9889836E6295D3636D3f84' // from deployments/arbitrum-testnet/SimpleDVNMock.json

// Create a custom fetchMetadata implementation to add SimpleDVNMock
const customFetchMetadata = async (): Promise<IMetadata> => {
    // Get the default metadata
    const defaultMetadata = await defaultFetchMetadata()

    // Validate that SimpleDVN addresses are provided
    if (!simpleDvnAddressOptimism || !simpleDvnAddressArbitrum) {
        throw new Error(
            'SimpleDVN addresses are required. Please set both simpleDvnAddressOptimism and simpleDvnAddressArbitrum variables with addresses from deployment files'
        )
    }

    // Extend the Optimism Sepolia DVNs with SimpleDVNMock
    const optimismSepoliaChain = defaultMetadata['optimism-sepolia']
    if (!optimismSepoliaChain) {
        throw new Error('Optimism Sepolia testnet not found in metadata')
    }

    const optimismSepoliaDVNsWithCustom: IMetadataDvns = {
        ...optimismSepoliaChain.dvns,
        [simpleDvnAddressOptimism]: {
            version: 2,
            canonicalName: 'SimpleDVNMock',
            id: 'simple-dvn-mock',
        },
    }

    // Extend the Arbitrum Sepolia DVNs with SimpleDVNMock
    const arbitrumSepoliaChain = defaultMetadata['arbitrum-sepolia']
    if (!arbitrumSepoliaChain) {
        throw new Error('Arbitrum Sepolia testnet not found in metadata')
    }

    const arbitrumSepoliaDVNsWithCustom: IMetadataDvns = {
        ...arbitrumSepoliaChain.dvns,
        [simpleDvnAddressArbitrum]: {
            version: 2,
            canonicalName: 'SimpleDVNMock',
            id: 'simple-dvn-mock',
        },
    }

    return {
        ...defaultMetadata,
        'optimism-sepolia': {
            ...optimismSepoliaChain,
            dvns: optimismSepoliaDVNsWithCustom,
        },
        'arbitrum-sepolia': {
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
// With SimpleDVNMock deployed on both chains, we use LayerZero Labs as required DVN and SimpleDVNMock as optional
const pathways: TwoWayConfig[] = [
    [
        optimismContract, // Chain A contract
        arbitrumContract, // Chain B contract
        [['SimpleDVNMock'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
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
