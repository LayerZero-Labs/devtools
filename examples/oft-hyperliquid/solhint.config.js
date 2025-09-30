module.exports = {
    ...require('@layerzerolabs/solhint-config'),
    rules: {
        ...require('@layerzerolabs/solhint-config').rules,
        'contract-name-camelcase': 'off',
    },
};
