// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EndpointId } = require('@layerzerolabs/lz-definitions');

const ethContract = {
    eid: EndpointId.ETHEREUM_V2_MAINNET,
    contractName: 'DefaultOAppRead',
};

const avaxContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'DefaultOAppRead',
};

module.exports = {
    contracts: [
        {
            contract: avaxContract,
            config: {
                readChannelConfigs: [
                    {
                        channelId: 4294967295,
                    },
                ],
            },
        },
        {
            contract: ethContract,
            config: {
                readChannelConfigs: [
                    {
                        channelId: 4294967295,
                    },
                ],
            },
        },
    ],
    connections: [],
};
