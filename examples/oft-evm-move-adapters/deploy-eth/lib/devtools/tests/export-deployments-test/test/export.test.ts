/* eslint-disable @typescript-eslint/no-var-requires */
/// <reference types="jest-extended" />

import { spawnSync } from 'child_process'
import { join } from 'path'
import { isDirectory } from '@layerzerolabs/io-devtools'
import { readFileSync } from 'fs'

describe(`export`, () => {
    describe('expectations', () => {
        const EXPECTATIONS_DIRECTORY = join('test', 'export.test.expectations')
        const expectationPath = (name: string) => join(EXPECTATIONS_DIRECTORY, `${name}.exp`)
        const runExpect = (name: string) =>
            spawnSync(expectationPath(name), {
                encoding: 'utf8',
                stdio: 'inherit',
            })

        beforeEach(() => {
            jest.resetModules()
        })

        it('should fail if deployments directory is missing', async () => {
            const result = runExpect('export-missing-deployments')

            expect(result.status).toBe(0)

            expect(isDirectory('../generated')).toBeFalse()
        })

        it('should not export excluded contracts', async () => {
            const result = runExpect('export-exclude')

            expect(result.status).toBe(0)
        })

        it('should export all contracts', async () => {
            const result = runExpect('export-all')

            expect(result.status).toBe(0)

            expect(require('../generated').names).toEqual(['Test'])
            expect(require('../generated/contracts')).toEqual({
                Test: {
                    addresses: {
                        britney: expect.any(String),
                        tango: expect.any(String),
                        vengaboys: expect.any(String),
                    },
                    abis: {
                        britney: expect.any(Array),
                        tango: expect.any(Array),
                        vengaboys: expect.any(Array),
                    },
                    transactionHashes: {
                        britney: expect.any(String),
                        tango: expect.any(String),
                        vengaboys: expect.any(String),
                    },
                },
            })
            expect(require('../generated/Test')).toEqual({
                addresses: {
                    britney: expect.any(String),
                    tango: expect.any(String),
                    vengaboys: expect.any(String),
                },
                abis: {
                    britney: expect.any(Array),
                    tango: expect.any(Array),
                    vengaboys: expect.any(Array),
                },
                transactionHashes: {
                    britney: expect.any(String),
                    tango: expect.any(String),
                    vengaboys: expect.any(String),
                },
            })
        })

        it('should export all contracts from a single network', async () => {
            const result = runExpect('export-network')

            expect(result.status).toBe(0)

            expect(require('../generated').names).toEqual(['Test'])
            expect(require('../generated/contracts')).toEqual({
                Test: {
                    addresses: {
                        tango: expect.any(String),
                    },
                    abis: {
                        tango: expect.any(Array),
                    },
                    transactionHashes: {
                        tango: expect.any(String),
                    },
                },
            })
            expect(require('../generated/Test')).toEqual({
                addresses: {
                    tango: expect.any(String),
                },
                abis: {
                    tango: expect.any(Array),
                },
                transactionHashes: {
                    tango: expect.any(String),
                },
            })
        })

        it('should include "as const" when exporting the ABIs', async () => {
            const result = runExpect('export-all')

            expect(result.status).toBe(0)

            const generated = readFileSync(join(__dirname, '..', 'generated', 'Test.ts'), 'utf8')
            expect(generated).toMatch(/as const/)
        })
    })
})
