/// <reference types="jest-extended" />

import hre from 'hardhat'
// import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@layerzerolabs/devtools-evm-hardhat'
import { spawnSync } from 'child_process'
import { join } from 'path'

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

        it('should validate valid safe configs', async () => {
            const result = runExpect('validate-valid-safe-configs')

            expect(result.status).toBe(0)
        })

        it('should validate invalid safe configs', async () => {
            const result = runExpect('validate-invalid-safe-configs')

            expect(result.status).toBe(0)
        })
    })

    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_VALIDATE_SAFE_CONFIGS]).not.toBeUndefined()
    })
})
