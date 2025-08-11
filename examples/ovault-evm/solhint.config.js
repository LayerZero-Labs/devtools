const config = require('@layerzerolabs/solhint-config');

module.exports = {
    ...config,
    rules: {
        ...config.rules,
        'one-contract-per-file': 'off',
    },
};
