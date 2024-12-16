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
            executor: '0x3ebD570ed38B1b3b4BC886999fcF507e9D584859',
        },
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405', '0x6f99eA3Fc9206E2779249E15512D7248dAb0B52e'],
            optionalDVNs: ['0x2dDf08e397541721acD82E5b8a1D0775454a180B', '0x6F978ee5bfd7b1A8085A3eA9e54eB76e668E195a'],
            optionalDVNThreshold: 1,
        },
    },
    receiveConfig: {
        ulnConfig: {
            confirmations: BigInt(5),
            requiredDVNs: ['0x0eE552262f7B562eFcED6DD4A7e2878AB897d405', '0x6f99eA3Fc9206E2779249E15512D7248dAb0B52e'],
            optionalDVNs: ['0x2dDf08e397541721acD82E5b8a1D0775454a180B', '0x6F978ee5bfd7b1A8085A3eA9e54eB76e668E195a'],
            optionalDVNThreshold: 1,
        },
    },
}

export const bscConfig = {
    accountConfig: bscAccountConfig,
    oappConfig: bscOAppConfig,
}
