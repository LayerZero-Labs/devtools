module.exports = {
    extends: ['@layerzerolabs/eslint-config-next/recommended'],
    settings: {
        'import/resolver': {
            typescript: {
                project: './tsconfig.json',
            },
        },
    },
    rules: {
        'turbo/no-undeclared-env-vars': 'off',
        'import/no-unresolved': 'warn',
    },
};
