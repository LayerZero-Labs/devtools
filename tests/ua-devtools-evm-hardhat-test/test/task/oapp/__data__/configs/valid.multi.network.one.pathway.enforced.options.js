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
                        value: 0,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 1,
                        receiver: '0x000000000000000000000000000000000000001',
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.ORDERED,
                    },
                ],
            },
        },
    ],
};
