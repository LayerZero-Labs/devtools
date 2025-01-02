import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppEdgeConfig, OAppNodeConfig } from '@layerzerolabs/toolbox-hardhat'

const aptosAccountConfig: OAppNodeConfig = {
    delegate: '3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a',
    owner: '3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a',
}

const aptosOAppConfig: OAppEdgeConfig = {
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
    sendLibrary: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
    receiveLibraryConfig: {
        // Required Receive Library Address on Aptos
        receiveLibrary: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
        // Optional Grace Period for Switching Receive Library Address on Aptos
        gracePeriod: BigInt(0),
    },
    // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on Aptos
    // receiveLibraryTimeoutConfig: {
    //     lib: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
    //     expiry: BigInt(XXX),
    // },
    sendConfig: {
        executorConfig: {
            maxMessageSize: 10000,
            // The configured Executor address on Aptos
            executor: '0xeb514e8d337485dd9ce7492f70128ef5aaa8c34023866e261a24ffa3d61a686d',
        },
        ulnConfig: {
            // The number of block confirmations to wait on Aptos before emitting the message from the source chain.
            confirmations: BigInt(10),
            // The address of the DVNs you will pay to verify a sent message on the source chain.
            // The destination tx will wait until ALL `requiredDVNs` verify the message.
            requiredDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
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
            confirmations: BigInt(10),
            // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain.
            // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
            requiredDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
            // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain.
            // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
            optionalDVNs: [],
            // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
            optionalDVNThreshold: 0,
        },
    },
}

export const aptosConfig = {
    accountConfig: aptosAccountConfig,
    oappConfig: aptosOAppConfig,
}
