import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'

import type { OAppNodeConfig, OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'

const bscAccountConfig: OAppNodeConfig = {
    owner: '0xb541D92fB1DD4d9736014ed521781b26c3b98b06',
    delegate: '0xb541D92fB1DD4d9736014ed521781b26c3b98b06',
}

const ethAccountConfig: OAppNodeConfig = {
    owner: '0xb541D92fB1DD4d9736014ed521781b26c3b98b06',
    delegate: '0xb541D92fB1DD4d9736014ed521781b26c3b98b06',
}

const bscOAppConfig: OAppEdgeConfig = {
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
    sendLibrary: '0x0f5D1ef48f12b6f691401bfe88c2037c690a6afe',
    receiveLibraryConfig: {
        receiveLibrary: '0x0f5D1ef48f12b6f691401bfe88c2037c690a6afe',
        gracePeriod: BigInt(0),
    },
    receiveLibraryTimeoutConfig: {
        lib: '0xec552B17995198A0e71E9198D047B5Ec42710359',
        expiry: BigInt(0),
    },
    sendConfig: {
        executorConfig: {
            maxMessageSize: 10000,
            executor: '0x0',
        },
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: ['0x0'],
            optionalDVNs: ['0x0'],
            optionalDVNThreshold: 0,
        },
    },
    receiveConfig: {
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: ['0x0'],
            optionalDVNs: ['0x0'],
            optionalDVNThreshold: 0,
        },
    },
}

const ethOAppConfig: OAppEdgeConfig = {
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
    sendLibrary: '0x0f5D1ef48f12b6f691401bfe88c2037c690a6afe',
    receiveLibraryConfig: {
        receiveLibrary: '0x0f5D1ef48f12b6f691401bfe88c2037c690a6afe',
        gracePeriod: BigInt(0),
    },
    receiveLibraryTimeoutConfig: {
        lib: '0xf342D22125Eddc24c6c3D716E048388D1415C20d',
        expiry: BigInt(0),
    },
    sendConfig: {
        executorConfig: {
            maxMessageSize: 10000,
            executor: '0x0',
        },
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: ['0x0'],
            optionalDVNs: ['0x0'],
            optionalDVNThreshold: 0,
        },
    },
    receiveConfig: {
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: ['0x0'],
            optionalDVNs: ['0x0'],
            optionalDVNThreshold: 0,
        },
    },
}

export const bscConfig = {
    accountConfig: bscAccountConfig,
    oappConfig: bscOAppConfig,
}

export const ethConfig = {
    accountConfig: ethAccountConfig,
    oappConfig: ethOAppConfig,
}
