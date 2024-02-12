/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    cache: false,
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
    },
};
