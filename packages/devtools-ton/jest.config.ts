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
}

export default config
