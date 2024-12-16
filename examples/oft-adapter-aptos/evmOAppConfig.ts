import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'

import type { OAppEdgeConfig, OAppNodeConfig } from '@layerzerolabs/toolbox-hardhat'

const bscAccountConfig: OAppNodeConfig = {
    owner: '0xEa3115C2aD19261E88AAc06e66ac5AFACb724b10',
    delegate: '0xEa3115C2aD19261E88AAc06e66ac5AFACb724b10',
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
    sendLibrary: '0x55f16c442907e86D764AFdc2a07C2de3BdAc8BB7',
    receiveLibraryConfig: {
        receiveLibrary: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
        gracePeriod: BigInt(0),
    },
    receiveLibraryTimeoutConfig: {
        lib: '0x188d4bbCeD671A7aA2b5055937F79510A32e9683',
        expiry: BigInt(500),
    },
    sendConfig: {
        executorConfig: {
            maxMessageSize: 65536,
            executor: '',
        },
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: [''],
            optionalDVNs: [''],
            optionalDVNThreshold: 0,
        },
    },
    receiveConfig: {
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: [''],
            optionalDVNs: [''],
            optionalDVNThreshold: 0,
        },
    },
}

export const bscConfig = {
    accountConfig: bscAccountConfig,
    oappConfig: bscOAppConfig,
}
