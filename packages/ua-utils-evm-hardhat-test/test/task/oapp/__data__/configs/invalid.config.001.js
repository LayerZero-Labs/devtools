const { EndpointId } = require('@layerzerolabs/lz-definitions');

module.exports = {
    contracts: [
        {
            eid: EndpointId.EON_MAINNET,
            contractName: 'DefaultOApp',
        },
        {
            eid: 'Invalid EndpointId',
            contractName: 'DefaultOApp',
        },
    ],
};
