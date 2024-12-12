import type { Config } from 'jest'

const config: Config = {
    cache: false,
    reporters: [['github-actions', { silent: false }], 'default'],
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.(t|j)sx?$': '@swc/jest',
    },
    testTimeout: 250000,
}

export default config
