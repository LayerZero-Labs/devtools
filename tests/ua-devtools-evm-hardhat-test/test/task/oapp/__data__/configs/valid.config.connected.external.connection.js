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
    eid: EndpointId.SOLANA_V2_MAINNET,
    address: '0x708687b6133d4eff7fdfe1adb237dfa01d3671f924f9991c5676729cedce9efd',
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
