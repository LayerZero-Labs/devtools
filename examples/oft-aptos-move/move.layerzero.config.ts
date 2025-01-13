import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyOFTMock',
}

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'oft',
}

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_TESTNET,
    contractName: 'MyOFTMock',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscContract,
            config: {
                owner: '0x0804a6e2798F42C7F3c97215DdF958d5500f8ec8',
                delegate: '0x0804a6e2798F42C7F3c97215DdF958d5500f8ec8',
            },
        },
        {
            contract: solanaContract,
            config: {
                owner: 'Fty7h4FYAN7z8yjqaJExMHXbUoJYMcRjWYmggSxLbHp8',
                delegate: 'Fty7h4FYAN7z8yjqaJExMHXbUoJYMcRjWYmggSxLbHp8',
            },
        },
        {
            contract: aptosContract,
            config: {
                delegate: '6070a006c8b26eb6054e5b78b9c906f63e53fc80ec6c4d8708cbb0577d5a6d4c',
                owner: '6070a006c8b26eb6054e5b78b9c906f63e53fc80ec6c4d8708cbb0577d5a6d4c',
            },
        },
    ],
    connections: [
        {
            from: aptosContract,
            to: bscContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80000, // gas limit in wei for EndpointV2.lzCompose
                        value: 0, // msg.value in wei for EndpointV2.lzCompose
                    },
                ],
                sendLibrary: '0xcc1c03aed42e2841211865758b5efe93c0dde2cb7a2a5dc6cf25a4e33ad23690',
                receiveLibraryConfig: {
                    // Required Receive Library Address on Aptos
                    receiveLibrary: '0xcc1c03aed42e2841211865758b5efe93c0dde2cb7a2a5dc6cf25a4e33ad23690',
                    // Optional Grace Period for Switching Receive Library Address on Aptos
                    gracePeriod: BigInt(0),
                },
                // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on Aptos
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address on Aptos
                        executor: '0x93353700091200ef9fdc536ce6a86182cc7e62da25f94356be9421c6310b9585',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on Aptos before emitting the message from the source chain.
                        confirmations: BigInt(1),
                        // The address of the DVNs you will pay to verify a sent message on the source chain.
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: ['0x756f8ab056688d22687740f4a9aeec3b361170b28d08b719e28c4d38eed1043e'],
                        // The address of the DVNs you will pay to verify a sent message on the source chain.
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
                // Optional Receive Configuration
                // @dev Controls how the `from` chain receives messages from the `to` chain.
                receiveConfig: {
                    ulnConfig: {
                        // The number of block confirmations to expect from the `to` chain.
                        confirmations: BigInt(1),
                        // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain.
                        // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
                        requiredDVNs: ['0x756f8ab056688d22687740f4a9aeec3b361170b28d08b719e28c4d38eed1043e'],
                        // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain.
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: bscContract,
            to: aptosContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000, // gas limit in wei for EndpointV2.lzCompose
                        value: 0, // msg.value in wei for EndpointV2.lzCompose
                    },
                ],
                sendLibrary: '0x55f16c442907e86D764AFdc2a07C2de3BdAc8BB7',
                receiveLibraryConfig: {
                    receiveLibrary: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x31894b190a8bAbd9A067Ce59fde0BfCFD2B18470',
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: aptosContract,
            to: solanaContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000,
                        value: 2500000,
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000,
                        value: 2500000,
                    },
                ],
                sendLibrary: '0xcc1c03aed42e2841211865758b5efe93c0dde2cb7a2a5dc6cf25a4e33ad23690',
                receiveLibraryConfig: {
                    // Required Receive Library Address on Aptos
                    receiveLibrary: '0xcc1c03aed42e2841211865758b5efe93c0dde2cb7a2a5dc6cf25a4e33ad23690',
                    // Optional Grace Period for Switching Receive Library Address on Aptos
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address on Aptos
                        executor: '0x93353700091200ef9fdc536ce6a86182cc7e62da25f94356be9421c6310b9585',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on Aptos before emitting the message from the source chain.
                        confirmations: BigInt(1),
                        // The address of the DVNs you will pay to verify a sent message on the source chain.
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: ['0x756f8ab056688d22687740f4a9aeec3b361170b28d08b719e28c4d38eed1043e'],
                        // The address of the DVNs you will pay to verify a sent message on the source chain.
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
                // Optional Receive Configuration
                // @dev Controls how the `from` chain receives messages from the `to` chain.
                receiveConfig: {
                    ulnConfig: {
                        // The number of block confirmations to expect from the `to` chain.
                        confirmations: BigInt(1),
                        // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain.
                        // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
                        requiredDVNs: ['0x756f8ab056688d22687740f4a9aeec3b361170b28d08b719e28c4d38eed1043e'],
                        // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain.
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        // {
        //     from: ethContract,
        //     to: aptosContract,
        //     config: {
        //         enforcedOptions: [
        //             {
        //                 msgType: 1,
        //                 optionType: ExecutorOptionType.LZ_RECEIVE,
        //                 gas: 200000, // gas limit in wei for EndpointV2.lzReceive
        //                 value: 0, // msg.value in wei for EndpointV2.lzReceive
        //             },
        //             {
        //                 msgType: 2,
        //                 optionType: ExecutorOptionType.LZ_RECEIVE,
        //                 gas: 200000, // gas limit in wei for EndpointV2.lzCompose
        //                 value: 0, // msg.value in wei for EndpointV2.lzCompose
        //             },
        //             {
        //                 msgType: 1,
        //                 optionType: ExecutorOptionType.NATIVE_DROP,
        //                 amount: 0, // amount of native gas token in wei to drop to receiver address
        //                 receiver: '0x0000000000000000000000000000000000000000',
        //             },
        //         ],
        //         sendLibrary: '0x55f16c442907e86D764AFdc2a07C2de3BdAc8BB7',
        //         receiveLibraryConfig: {
        //             receiveLibrary: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
        //             gracePeriod: BigInt(0),
        //         },
        //         receiveLibraryTimeoutConfig: {
        //             lib: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
        //             expiry: BigInt(500),
        //         },
        //         sendConfig: {
        //             executorConfig: {
        //                 maxMessageSize: 65536,
        //                 executor: '0x3ebD570ed38B1b3b4BC886999fcF507e9D584859',
        //             },
        //             ulnConfig: {
        //                 confirmations: BigInt(1),
        //                 requiredDVNs: [
        //                     '0x0eE552262f7B562eFcED6DD4A7e2878AB897d405',
        //                     '0x6f99eA3Fc9206E2779249E15512D7248dAb0B52e',
        //                 ],
        //                 optionalDVNs: [
        //                     '0x2dDf08e397541721acD82E5b8a1D0775454a180B',
        //                     '0x6F978ee5bfd7b1A8085A3eA9e54eB76e668E195a',
        //                 ],
        //                 optionalDVNThreshold: 1,
        //             },
        //         },
        //         receiveConfig: {
        //             ulnConfig: {
        //                 confirmations: BigInt(1),
        //                 requiredDVNs: [
        //                     '0x0eE552262f7B562eFcED6DD4A7e2878AB897d405',
        //                     '0x6f99eA3Fc9206E2779249E15512D7248dAb0B52e',
        //                 ],
        //                 optionalDVNs: [
        //                     '0x2dDf08e397541721acD82E5b8a1D0775454a180B',
        //                     '0x6F978ee5bfd7b1A8085A3eA9e54eB76e668E195a',
        //                 ],
        //                 optionalDVNThreshold: 1,
        //             },
        //         },
        //     },
        // },
    ],
}

export default config
