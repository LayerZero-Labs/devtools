import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

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
            config: {
                owner: '0x462c2AE39B6B0bdB950Deb2BC82082308cF8cB10',
                delegate: '0x462c2AE39B6B0bdB950Deb2BC82082308cF8cB10',
            },
        },
        {
            contract: aptosContract,
            config: {
                delegate: '58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e',
                owner: '58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e',
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
                receiveLibraryTimeoutConfig: {
                    lib: '0xcc1c03aed42e2841211865758b5efe93c0dde2cb7a2a5dc6cf25a4e33ad23690',
                    expiry: BigInt(1000000000),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address on Aptos
                        executor: '0x93353700091200ef9fdc536ce6a86182cc7e62da25f94356be9421c6310b9585',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on Aptos before emitting the message from the source chain.
                        confirmations: BigInt(260),
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
                        confirmations: BigInt(5),
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
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 0, // amount of native gas token in wei to drop to receiver address
                        receiver: '0x0000000000000000000000000000000000000000',
                    },
                ],
                sendLibrary: '0x55f16c442907e86D764AFdc2a07C2de3BdAc8BB7',
                receiveLibraryConfig: {
                    receiveLibrary: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
                    gracePeriod: BigInt(0),
                },
                receiveLibraryTimeoutConfig: {
                    lib: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
                    expiry: BigInt(5000),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 65536,
                        executor: '0x3ebD570ed38B1b3b4BC886999fcF507e9D584859',
                    },
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 1,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
    ],
}

export default config
