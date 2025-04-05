require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true, // Add this line to prevent ESLint from looking up the directory tree
    extends: ['@layerzerolabs/eslint-config-next/recommended'],
    rules: {
        // @layerzerolabs/eslint-config-next defines rules for turborepo-based projects
        // that are not relevant for this particular project
        'turbo/no-undeclared-env-vars': 'off',
        // Explicitly disable no-unresolved for LayerZero packages
        'import/no-unresolved': [
            'error',
            {
                ignore: ['@layerzerolabs/hyperliquid-composer'],
            },
        ],
    },
    settings: {
        'import/resolver': {
            typescript: {
                project: './tsconfig.json',
            },
            node: {
                moduleDirectory: ['node_modules', '.'],
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
};
