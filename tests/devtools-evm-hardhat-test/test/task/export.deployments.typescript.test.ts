/* eslint-disable @typescript-eslint/no-var-requires */
/// <reference types="jest-extended" />

import { TASK_LZ_EXPORT_DEPLOYMENTS_TYPESCRIPT } from '@layerzerolabs/devtools-evm-hardhat'
import { spawnSync } from 'child_process'
import { join } from 'path'

describe(`task ${TASK_LZ_EXPORT_DEPLOYMENTS_TYPESCRIPT}`, () => {
    describe('expectations', () => {
        const EXPECTATIONS_DIRECTORY = join('test', 'task', 'export.deployments.typescript.expectations')
        const expectationPath = (name: string) => join(EXPECTATIONS_DIRECTORY, `${name}.exp`)
        const runExpect = (name: string) =>
            spawnSync(expectationPath(name), {
                encoding: 'utf8',
                stdio: 'inherit',
            })

        const ALL_NETWORKS = ['britney', 'tango', 'vengaboys']
        const ALL_DEPLOYMENTS = [
            'DefaultProxyAdmin',
            'TestProxy',
            'TestProxy_Implementation',
            'TestProxy_Proxy',
            'Thrower',
        ]

        beforeEach(() => {
            // We need to reset the modules so that the imports of ../../generated are not cached
            jest.resetModules()
        })

        it('should export all deployments', async () => {
            const result = runExpect('export-all')

            expect(result.status).toBe(0)

            expect(require('../../generated').names).toContainAllValues(ALL_DEPLOYMENTS)
            expect(require('../../generated/TestProxy').abis).toContainAllKeys(ALL_NETWORKS)
            expect(require('../../generated/Thrower').abis).toContainAllKeys(ALL_NETWORKS)
        })

        it('should export a single contract on all networks', async () => {
            const result = runExpect('export-contract')

            expect(result.status).toBe(0)

            expect(require('../../generated').names).toEqual(['Thrower'])
            expect(require('../../generated/Thrower').abis).toContainAllKeys(ALL_NETWORKS)
        })

        it('should error out without deployments folder', async () => {
            const result = runExpect('export-missing-deployments')

            expect(result.status).toBe(0)
        })

        it('should export a single network', async () => {
            const result = runExpect('export-network')

            expect(result.status).toBe(0)

            expect(require('../../generated').names).toContainAllValues(ALL_DEPLOYMENTS)
            expect(require('../../generated/TestProxy').abis).toContainAllKeys(['tango'])
            expect(require('../../generated/Thrower').abis).toContainAllKeys(['tango'])
        })
    })
})
