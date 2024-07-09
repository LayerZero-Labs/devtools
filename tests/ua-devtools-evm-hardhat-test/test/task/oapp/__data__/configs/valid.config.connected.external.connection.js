// eslint-disable-next-line @typescript-eslint/no-var-requires
const { makeBytes32 } = require('@layerzerolabs/devtools');
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

// This contract points to a Solana contract that is not present in the hardhat config
//
// Since it's only used as a `to` in a connection, the scripts should still work
const solContract = {
    eid: EndpointId.SEPOLIA_V2_MAINNET,
    address: makeBytes32('0x7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH'),
};

module.exports = {
    contracts: [
        {
            contract: avaxContract,
        },
        {
            contract: ethContract,
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
        {
            from: ethContract,
            to: solContract,
        },
    ],
};
