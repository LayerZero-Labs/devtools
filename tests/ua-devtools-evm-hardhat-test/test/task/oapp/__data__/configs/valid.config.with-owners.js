// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EndpointId } = require('@layerzerolabs/lz-definitions');

const ethContract = {
    eid: EndpointId.ETHEREUM_V2_MAINNET,
    contractName: 'DefaultOApp',
};

const avaxContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'DefaultOApp',
};

module.exports = {
    contracts: [
        {
            contract: avaxContract,
            config: {
                owner: '0x1f9090aae28b8a3dceadf281b0f12828e676c326',
            },
        },
        {
            contract: ethContract,
            config: {
                owner: '0x1f9090aae28b8a3dceadf281b0f12828e676c326',
            },
        },
    ],
    connections: [
        {
            from: avaxContract,
            to: ethContract,
        },
        {
            from: ethContract,
            to: avaxContract,
        },
    ],
};
