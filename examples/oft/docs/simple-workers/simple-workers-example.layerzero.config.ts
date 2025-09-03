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

// TODO: Fill in your Simple Workers addresses from deployment files
const simpleDvnAddressOptimism = '' // from deployments/optimism-testnet/SimpleDVNMock.json
const simpleDvnAddressArbitrum = '' // from deployments/arbitrum-testnet/SimpleDVNMock.json
const simpleExecutorAddressOptimism = '' // from deployments/optimism-testnet/SimpleExecutorMock.json
const simpleExecutorAddressArbitrum = '' // from deployments/arbitrum-testnet/SimpleExecutorMock.json
const destinationExecutorAddressOptimism = '' // from deployments/optimism-testnet/DestinationExecutorMock.json
const destinationExecutorAddressArbitrum = '' // from deployments/arbitrum-testnet/DestinationExecutorMock.json

// Create a custom fetchMetadata implementation to add Simple Workers (SimpleDVNMock and SimpleExecutorMock)
const customFetchMetadata = async (): Promise<IMetadata> => {
    // Get the default metadata
    const defaultMetadata = await defaultFetchMetadata()

    // Validate that Simple Workers addresses are provided
    if (
        !simpleDvnAddressOptimism ||
        !simpleDvnAddressArbitrum ||
        !simpleExecutorAddressOptimism ||
        !simpleExecutorAddressArbitrum ||
        !destinationExecutorAddressOptimism ||
        !destinationExecutorAddressArbitrum
    ) {
        throw new Error(
            'Simple Workers addresses are required. Please set simpleDvnAddressOptimism, simpleDvnAddressArbitrum, simpleExecutorAddressOptimism, simpleExecutorAddressArbitrum, destinationExecutorAddressOptimism, and destinationExecutorAddressArbitrum variables with addresses from deployment files'
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
            deployments: [
                ...(optimismSepoliaChain.deployments || []),
                {
                    eid: '40232',
                    chainKey: 'optimism-sepolia',
                    stage: 'testnet',
                    version: 2,
                    executor: { address: simpleExecutorAddressOptimism },
                },
            ],
        },
        'arbitrum-sepolia': {
            ...arbitrumSepoliaChain,
            dvns: arbitrumSepoliaDVNsWithCustom,
            deployments: [
                ...(arbitrumSepoliaChain.deployments || []),
                {
                    eid: '40231',
                    chainKey: 'arbitrum-sepolia',
                    stage: 'testnet',
                    version: 2,
                    executor: { address: simpleExecutorAddressArbitrum },
                },
            ],
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

// With SimpleDVNMock deployed on both chains, we can use it as the only required DVN
const pathways: TwoWayConfig[] = [
    [
        optimismContract, // Chain A contract
        arbitrumContract, // Chain B contract
        [['SimpleDVNMock'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ] - SimpleDVNMock as only required DVN
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
