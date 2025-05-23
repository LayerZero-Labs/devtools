/// <reference types="jest-extended" />

import hre from 'hardhat'
import { join } from 'path'
import { TASK_LZ_VALIDATE_RPCS } from '@layerzerolabs/devtools-evm-hardhat'
import { spawnSync } from 'child_process'

// eslint-disable-next-line jest/no-disabled-tests
describe(`task ${TASK_LZ_VALIDATE_RPCS}`, () => {
    describe('expectations', () => {
        const EXPECTATIONS_DIRECTORY = join('test', 'task', 'validate.rpcs.test.expectations')
        const expectationPath = (name: string) => join(EXPECTATIONS_DIRECTORY, `${name}.exp`)
        const runExpect = (name: string) =>
            spawnSync(expectationPath(name), {
                encoding: 'utf8',
                stdio: 'inherit',
            })

        it('should validate all networks when no arguments are provided', async () => {
            const result = runExpect('validate-all-networks')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs for specific networks (valid rpc)', async () => {
            const result = runExpect('validate-for-specific-networks')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs only for a specific stage (sandbox)', async () => {
            const result = runExpect('validate-for-specific-stage-sandbox')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs only for a specific stage (testnet)', async () => {
            const result = runExpect('validate-for-specific-stage-testnet')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs only for a specific stage (mainnet)', async () => {
            const result = runExpect('validate-for-specific-stage-mainnet')

            expect(result.status).toBe(0)
        })

        it('should not allow both --networks and --stage arguments together', async () => {
            const result = runExpect('validate-with-network-and-stage')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs for a network without an EID', async () => {
            const result = runExpect('validate-rpc-for-network-without-eid')

            expect(result.status).toBe(0)
        })

        it('should validate incorrect https RPC URL', async () => {
            const result = runExpect('validate-incorrect-https-rpc')
            expect(result.status).toBe(0)
        })

        it('should validate incorrect wss RPC URL', async () => {
            const result = runExpect('validate-incorrect-wss-rpc')
            /*
                {
                    status: 1,
                    signal: null,
                    output: [ null, null, null ],
                    pid: 2390,
                    stdout: null,
                    stderr: null
                }
            */

            expect(result.signal).toBeNull()
            expect(result.stdout).toBeNull()
            expect(result.stderr).toBeNull()
        })

        it('should validate invalid RPC URL', async () => {
            const result = runExpect('validate-invalid-rpc')

            expect(result.status).toBe(0)
        })

        it('should validate multiple RPC URLs', async () => {
            const result = runExpect('validate-multiple-rpcs')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs with explicit timeout', async () => {
            const result = runExpect('validate-rpc-timeout')

            expect(result.status).toBe(0)
        })

        it('should validate RPC URLs with explicit retries', async () => {
            const result = runExpect('validate-rpc-retries')

            expect(result.status).toBe(0)
        })

        it('should validate invalid RPC URLs with --continue flag', async () => {
            const result = runExpect('validate-invalid-rpc-with-continue')

            expect(result.status).toBe(0)
        })

        it('should validate unresponsive https RPC URL', async () => {
            const result = runExpect('validate-unresponsive-https-rpc')

            expect(result.status).toBe(0)
        })

        it('should validate unresponsive wss RPC URL', async () => {
            const result = runExpect('validate-unresponsive-wss-rpc')

            expect(result.status).toBe(0)
        })

        it('should validate valid https RPC URL', async () => {
            const result = runExpect('validate-valid-https-rpc')

            expect(result.status).toBe(0)
        })

        it('should validate valid wss RPC URL', async () => {
            const result = runExpect('validate-valid-wss-rpc')

            expect(result.status).toBe(0)
        })
    })

    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_VALIDATE_RPCS]).not.toBeUndefined()
    })
})
