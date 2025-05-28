/// <reference types="jest-extended" />

import hre from 'hardhat'
import { join } from 'path'
import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@layerzerolabs/devtools-evm-hardhat'
import { spawnSync } from 'child_process'

describe(`task ${TASK_LZ_VALIDATE_SAFE_CONFIGS}`, () => {
    describe('expectations', () => {
        const EXPECTATIONS_DIRECTORY = join('test', 'task', 'validate.safe.configs.test.expectations')
        const expectationPath = (name: string) => join(EXPECTATIONS_DIRECTORY, `${name}.exp`)
        const runExpect = (name: string) =>
            spawnSync(expectationPath(name), {
                encoding: 'utf8',
                stdio: 'inherit',
            })

        it('should validate no safe configs', async () => {
            const result = runExpect('validate-no-safe-configs')

            expect(result.status).toBe(0)
        })

        /* 
            SKIP TEST because of Safe UI hack on Feb 21, 2025
            Safe's API was turned off to prevent future hacks.
            https://safe-transaction-mainnet.safe.global/ - returns 404
            Information about the hack - https://twitter.com/senamakel/status/1893001991971905542
            TODO: remove skip when the hack is fixed
        */
        // eslint-disable-next-line jest/no-disabled-tests
        it('should validate valid safe configs', async () => {
            const result = runExpect('validate-valid-safe-configs')

            expect(result.status).toBe(0)
        })

        it('should validate invalid safe configs', async () => {
            const result = runExpect('validate-invalid-safe-configs')

            expect(result.status).toBe(0)
        })

        it('should validate missing safe address', async () => {
            const result = runExpect('validate-missing-safe-address')

            expect(result.status).toBe(0)
        })

        it('should validate missing safe url', async () => {
            const result = runExpect('validate-missing-safe-url')

            expect(result.status).toBe(0)
        })
    })

    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_VALIDATE_SAFE_CONFIGS]).not.toBeUndefined()
    })
})
