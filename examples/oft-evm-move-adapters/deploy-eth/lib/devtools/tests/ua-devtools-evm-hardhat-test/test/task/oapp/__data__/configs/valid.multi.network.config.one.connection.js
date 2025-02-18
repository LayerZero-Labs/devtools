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
        },
    ],
};
