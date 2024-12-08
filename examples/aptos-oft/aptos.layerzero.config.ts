import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'
import { bscConfig } from './evmOAppConfig'
import { ethConfig } from './evmOAppConfig'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const ethereumContract: OmniPointHardhat = {
    eid: EndpointId.ETHEREUM_V2_TESTNET,
    contractName: 'MyOFT',
}

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'oft',
}

const ethereumSandboxContract: OmniPointHardhat = {
    eid: EndpointId.ETHEREUM_V2_SANDBOX,
    contractName: 'MyOFT',
}

const bscSandboxContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_SANDBOX,
    contractName: 'MyOFT',
}

const aptosSandboxContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_SANDBOX,
    contractName: 'oft',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: ethereumContract,
            config: ethConfig.accountConfig,
        },
        {
            contract: bscContract,
            config: bscConfig.accountConfig,
        },
        {
            contract: ethereumSandboxContract,
            config: ethConfig.accountConfig,
        },
        {
            contract: bscSandboxContract,
            config: bscConfig.accountConfig,
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
                        gas: 1000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 1000, // gas limit in wei for EndpointV2.lzCompose
                        value: 0, // msg.value in wei for EndpointV2.lzCompose
                    },
                    // {
                    //     msgType: 1,
                    //     optionType: ExecutorOptionType.NATIVE_DROP,
                    //     amount: 0, // amount of native gas token in wei to drop to receiver address
                    //     receiver: '0x0000000000000000000000000000000000000000',
                    // },
                ],
                sendLibrary: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
                receiveLibraryConfig: {
                    // Required Receive Library Address on from
                    receiveLibrary: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
                    // Optional Grace Period for Switching Receive Library Address on from
                    gracePeriod: BigInt(0),
                },
                // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on from
                receiveLibraryTimeoutConfig: {
                    lib: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
                    expiry: BigInt(696969669),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address on from
                        executor: '0xeb514e8d337485dd9ce7492f70128ef5aaa8c34023866e261a24ffa3d61a686d',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on from before emitting the message from the source chain (from).
                        confirmations: BigInt(5),
                        // The address of the DVNs you will pay to verify a sent message on the source chain (from).
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
                        // The address of the DVNs you will pay to verify a sent message on the source chain (from).
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                        optionalDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 1,
                    },
                },
                // Optional Receive Configuration
                // @dev Controls how the `from` chain receives messages from the `to` chain.
                receiveConfig: {
                    ulnConfig: {
                        // The number of block confirmations to expect from the `to` chain (Sepolia).
                        confirmations: BigInt(5),
                        // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain (BSC).
                        // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
                        requiredDVNs: ['0x0'],
                        // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain (BSC).
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
                        optionalDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 1,
                    },
                },
            },
        },
        {
            from: bscContract,
            to: aptosContract,
            config: bscConfig.oappConfig,
        },
        {
            from: ethereumContract,
            to: aptosContract,
            config: ethConfig.oappConfig,
        },
        {
            from: bscSandboxContract,
            to: aptosSandboxContract,
            config: bscConfig.oappConfig,
        },
        {
            from: ethereumSandboxContract,
            to: aptosSandboxContract,
            config: ethConfig.oappConfig,
        },
    ],
}

export default config
