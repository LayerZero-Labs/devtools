/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    cache: false,
    reporters: [['github-actions', { silent: false }], 'default'],
    testTimeout: 15_000,
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
        '^.+\\.conf$': '<rootDir>/jest.transformer.raw.js',
    },
};
