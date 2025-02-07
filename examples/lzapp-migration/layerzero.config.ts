import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_TESTNET, /// EndpointV1
    contractName: 'MyLzApp',
}

const arbSepoliaContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOApp',
}

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_TESTNET,
    address: 'GLG35zL9MjAN9hqs17Cx681GzLwKjdbkPrtCA1kf18fJ', // NOTE: update this with the OFTStore address.
}

// The values here are for development purposes. E.g. confirmations are set to 1. For production, they should be reviewed and edited accordingly.
const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: sepoliaContract,
        },
        // {
        //     contract: arbSepoliaContract,
        // },
        {
            contract: solanaContract,
        },
    ],
    connections: [
        // {
        //     from: arbSepoliaContract,
        //     to: sepoliaContract,
        //     config: {
        //         sendLibrary: '0x4f7cd4DA19ABB31b0eC98b9066B9e857B1bf9C0E',
        //         receiveLibraryConfig: {
        //             receiveLibrary: '0x75Db67CDab2824970131D5aa9CECfC9F69c69636',
        //             gracePeriod: BigInt(0),
        //         },
        //         sendConfig: {
        //             executorConfig: {
        //                 maxMessageSize: 10000,
        //                 executor: '0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897',
        //             },
        //             ulnConfig: {
        //                 confirmations: BigInt(1),
        //                 requiredDVNs: ['0x53f488e93b4f1b60e8e83aa374dbe1780a1ee8a8'], // LayerZero Labs DVN for Arbitrum Sepolia
        //                 optionalDVNs: [],
        //                 optionalDVNThreshold: 0,
        //             },
        //         },
        //         receiveConfig: {
        //             ulnConfig: {
        //                 confirmations: BigInt(1),
        //                 requiredDVNs: ['0x53f488e93b4f1b60e8e83aa374dbe1780a1ee8a8'], // LayerZero Labs DVN for Arbitrum Sepolia
        //                 optionalDVNs: [],
        //                 optionalDVNThreshold: 0,
        //             },
        //         },
        //     },
        // },
        // {
        //     from: sepoliaContract,
        //     to: arbSepoliaContract,
        //     config: {
        //         sendLibrary: '0x6862b19f6e42a810946B9C782E6ebE26Ad266C84',
        //         receiveLibraryConfig: {
        //             receiveLibrary: '0x5937A5fe272fbA38699A1b75B3439389EEFDb399',
        //             gracePeriod: BigInt(0),
        //         },
        //         sendConfig: {
        //             executorConfig: {
        //                 maxMessageSize: 10000,
        //                 executor: '0x718B92b5CB0a5552039B593faF724D182A881eDA',
        //             },
        //             ulnConfig: {
        //                 confirmations: BigInt(1),
        //                 requiredDVNs: ['0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193'], // LayerZero Labs DVN on Ethereum Sepolia
        //                 optionalDVNs: [],
        //                 optionalDVNThreshold: 0,
        //             },
        //         },
        //         receiveConfig: {
        //             ulnConfig: {
        //                 confirmations: BigInt(1),
        //                 requiredDVNs: ['0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193'], // LayerZero Labs DVN on Ethereum Sepolia
        //                 optionalDVNs: [],
        //                 optionalDVNThreshold: 0,
        //             },
        //         },
        //     },
        // },
        {
            from: sepoliaContract,
            to: solanaContract,
            config: {
                sendLibrary: '0x6862b19f6e42a810946B9C782E6ebE26Ad266C84',
                receiveLibraryConfig: {
                    receiveLibrary: '0x5937A5fe272fbA38699A1b75B3439389EEFDb399',
                    gracePeriod: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x718B92b5CB0a5552039B593faF724D182A881eDA',
                    },
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193'], // LayerZero Labs DVN
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: BigInt(1),
                        requiredDVNs: ['0x8eebf8b423b73bfca51a1db4b7354aa0bfca9193'],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0,
                    },
                },
            },
        },
        {
            from: solanaContract,
            to: sepoliaContract,
            // TODO Here are some default settings that have been found to work well sending to Sepolia.
            // You need to either enable these enforcedOptions or pass in extraOptions when calling send().
            // Having neither will cause a revert when calling send().
            // We suggest performing additional profiling to ensure they are correct for your use case.
            config: {
                sendLibrary: '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH',
                receiveLibraryConfig: {
                    receiveLibrary: '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH',
                    gracePeriod: BigInt(0),
                },
                // Optional Send Configuration
                // @dev Controls how the `from` chain sends messages to the `to` chain.
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address.  Note, this is the executor PDA not the program ID.
                        executor: 'AwrbHeCyniXaQhiJZkLhgWdUCteeWSGaSN1sTfLiY7xK',
                    },
                    ulnConfig: {
                        // // The number of block confirmations to wait before emitting the message from the source chain.
                        confirmations: BigInt(1),
                        // The address of the DVNs you will pay to verify a sent message on the source chain ).
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: [
                            '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb', // LayerZero
                        ],
                        // The address of the DVNs you will pay to verify a sent message on the source chain ).
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
                        // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain ).
                        // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
                        requiredDVNs: [
                            '4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb', // LayerZero
                        ],
                        // The address of the DVNs you will pay to verify a sent message on the source chain ).
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000,
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000,
                    },
                ],
            },
        },
    ],
}

export default config
