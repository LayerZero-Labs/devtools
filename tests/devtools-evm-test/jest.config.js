/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    cache: false,
    reporters: [['github-actions', { silent: false }], 'default'],
    testEnvironment: 'node',
    testTimeout: 150_000,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
    },
};
