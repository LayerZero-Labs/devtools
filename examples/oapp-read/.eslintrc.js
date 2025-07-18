require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true,
    extends: ['@layerzerolabs/eslint-config-next/recommended'],
    rules: {
        'turbo/no-undeclared-env-vars': 'off',
        'import/no-unresolved': 'warn',
    },
};
