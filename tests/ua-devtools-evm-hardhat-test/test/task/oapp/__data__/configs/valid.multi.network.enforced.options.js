// eslint-disable-next-line @typescript-eslint/no-var-requires
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions';

const ethContract = {
    eid: EndpointId.ETHEREUM_V2_MAINNET,
    contractName: 'DefaultOApp',
};

const avaxContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'DefaultOApp',
};

const bscContract = {
    eid: EndpointId.BSC_V2_MAINNET,
    contractName: 'DefaultOApp',
};

module.exports = {
    contracts: [
        {
            contract: avaxContract,
        },
        {
            contract: ethContract,
        },
        {
            contract: bscContract,
        },
    ],
    connections: [
        {
            from: ethContract,
            to: avaxContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000,
                        value: 1,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 1,
                        receiver: '0x000000000000000000000000000000000000001',
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 2,
                        receiver: '0x000000000000000000000000000000000000002',
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.COMPOSE,
                        index: 0,
                        gas: 200000,
                        value: 1,
                    },
                    {
                        msgType: 3,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 2,
                        receiver: '0x000000000000000000000000000000000000002',
                    },
                ],
            },
        },
        {
            from: ethContract,
            to: bscContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200000,
                        value: 0,
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 1,
                        receiver: '0x000000000000000000000000000000000000001',
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.COMPOSE,
                        index: 0,
                        gas: 200500,
                        value: 1,
                    },
                ],
            },
        },
        {
            from: avaxContract,
            to: ethContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 300000,
                        value: 1,
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.COMPOSE,
                        index: 0,
                        gas: 200000,
                        value: 1,
                    },
                ],
            },
        },
        {
            from: avaxContract,
            to: bscContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 150000,
                        value: 0,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 1,
                        receiver: '0x000000000000000000000000000000000000002',
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 4,
                        receiver: '0x000000000000000000000000000000000000003',
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 2,
                        receiver: '0x000000000000000000000000000000000000002',
                    },
                ],
            },
        },
        {
            from: bscContract,
            to: ethContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 200001,
                        value: 1,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.COMPOSE,
                        index: 0,
                        gas: 200000,
                        value: 1,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.COMPOSE,
                        index: 1,
                        gas: 300000,
                        value: 1,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 2,
                        receiver: '0x000000000000000000000000000000000000002',
                    },
                ],
            },
        },
        {
            from: bscContract,
            to: avaxContract,
            config: {
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 150000,
                        value: 0,
                    },
                ],
            },
        },
    ],
};
