import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'
import { bscConfig, ethConfig } from './evmOAppConfig'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const ethereumContract: OmniPointHardhat = {
    eid: EndpointId.ETHEREUM_V2_SANDBOX,
    contractName: 'MyOFT',
}

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_SANDBOX,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
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
            contract: aptosContract,
            config: {
                delegate: '3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a',
                owner: '3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a',
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
                        gas: 100000, // gas limit in wei for EndpointV2.lzReceive
                        value: 0, // msg.value in wei for EndpointV2.lzReceive
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 100000, // gas limit in wei for EndpointV2.lzCompose
                        value: 0, // msg.value in wei for EndpointV2.lzCompose
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 0, // amount of native gas token in wei to drop to receiver address
                        receiver: '0x0000000000000000000000000000000000000000',
                    },
                ],
                sendLibrary: '0x3f2714ef2d63f1128f45e4a3d31b354c1c940ccdb38aca697c9797ef95e7a09f',
                receiveLibraryConfig: {
                    // Required Receive Library Address on from
                    receiveLibrary: '0x3f2714ef2d63f1128f45e4a3d31b354c1c940ccdb38aca697c9797ef95e7a09f',
                    // Optional Grace Period for Switching Receive Library Address on from
                    gracePeriod: BigInt(0),
                },
                // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on from
                receiveLibraryTimeoutConfig: {
                    lib: '0x3f2714ef2d63f1128f45e4a3d31b354c1c940ccdb38aca697c9797ef95e7a09f',
                    expiry: BigInt(0),
                },
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address on from
                        executor: '0x806020afea680a0c0f32431acdfcf1a7e31ace28ce81b73da4f27c5898155590',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on from before emitting the message from the source chain (from).
                        confirmations: BigInt(5),
                        // The address of the DVNs you will pay to verify a sent message on the source chain (from).
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                        // The address of the DVNs you will pay to verify a sent message on the source chain (from).
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                        optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
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
                        optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
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
    ],
}

export default config
