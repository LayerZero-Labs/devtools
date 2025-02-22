import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

enum MsgType {
    SEND = 1,
    SEND_AND_CALL = 2,
}

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyOFT',
}

const initiaContract: OmniPointHardhat = {
    eid: EndpointId.INITIA_V2_TESTNET,
    contractName: 'MyOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: bscContract,
            config: {
                owner: '',
                delegate: '',
            },
        },
        {
            contract: initiaContract,
            config: {
                delegate: '', // For initia, this address must be in hex format i.e. 0x...
                owner: '', // For initia, this address must be in hex format i.e. 0x...
            },
        },
    ],
    connections: [
        {
            from: initiaContract,
            to: bscContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: MsgType.SEND,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: MsgType.SEND_AND_CALL,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 80_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                ],
                sendLibrary: '0x3e1b182c40965a986133798e1da76302ef327de2c32c58110361587560285e88',
                receiveLibraryConfig: {
                    // Required Receive Library Address on Aptos
                    receiveLibrary: '0x3e1b182c40965a986133798e1da76302ef327de2c32c58110361587560285e88',
                    // Optional Grace Period for Switching Receive Library Address on Aptos
                    gracePeriod: BigInt(0),
                },
                // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on Aptos
                // receiveLibraryTimeoutConfig: {
                //     lib: '0x3e1b182c40965a986133798e1da76302ef327de2c32c58110361587560285e88',
                //     expiry: BigInt(1000000000),
                // },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10_000,
                        // The configured Executor address on Aptos
                        executor: '0x798c194c8740dde76a0e3f46f444f7ee974765abb2a9db98be03a0ee89ce050c',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on Aptos before emitting the message from the source chain.
                        confirmations: BigInt(10),
                        // The address of the DVNs you will pay to verify a sent message on the source chain.
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: ['0x3f12330ba9e26a604e2149b4b67c0710d32fcbc3de0bea76dd43dbb6b747bc8c'],
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
                        requiredDVNs: ['0x3f12330ba9e26a604e2149b4b67c0710d32fcbc3de0bea76dd43dbb6b747bc8c'],
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
            to: initiaContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: MsgType.SEND,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 5_000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: MsgType.SEND_AND_CALL,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 5_000, // gas limit in wei for EndpointV2.lzCompose
                        value: 0, // msg.value in wei for EndpointV2.lzCompose
                    },
                ],
                sendLibrary: '0x55f16c442907e86D764AFdc2a07C2de3BdAc8BB7',
                receiveLibraryConfig: {
                    receiveLibrary: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
                    gracePeriod: BigInt(0),
                },
                // receiveLibraryTimeoutConfig: {
                //     lib: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
                //     expiry: BigInt(67323472),
                // },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10_000,
                        executor: '0x31894b190a8bAbd9A067Ce59fde0BfCFD2B18470',
                    },
                    ulnConfig: {
                        confirmations: BigInt(5),
                        requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405'],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(10),
                        requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405'],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
    ],
}

export default config
