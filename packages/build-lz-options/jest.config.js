/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    reporters: [['github-actions', { silent: false }], 'default'],
    testEnvironment: 'node',
    testTimeout: 15000,
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
};
