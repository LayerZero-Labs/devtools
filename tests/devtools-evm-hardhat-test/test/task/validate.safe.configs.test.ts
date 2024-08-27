/// <reference types="jest-extended" />

import hre from 'hardhat'
// import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@layerzerolabs/devtools-evm-hardhat'
import { spawnSync } from 'child_process'
import { join } from 'path'

// const validHRE: HardhatRuntimeEnvironment = {
//     ...hre,
//     userConfig: {
//         ...hre.userConfig,
//         networks: {
//             ...hre.userConfig.networks,
//             ethereum: {
//                 safeConfig: {
//                     safeAddress: '0xCDa8e3ADD00c95E5035617F970096118Ca2F4C92',
//                     safeUrl: 'https://safe-transaction-mainnet.safe.global/',
//                 },
//             },
//         },
//     },
// }

// const invalidHRE: HardhatRuntimeEnvironment = {
//     ...hre,
//     userConfig: {
//         ...hre.userConfig,
//         networks: {
//             ...hre.userConfig.networks,
//             ethereum: {
//                 safeConfig: {
//                     safeAddress: '0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7',
//                     safeUrl: 'https://wrong-url.safe.global/',
//                 },
//             },
//         },
//     },
// }

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

            // TODO should there be more validations here or should we leave it up to the .exp file?
        })

        // it('should validate valid safe configs', async () => {
        //     const result = runExpect('validate-valid-safe-configs')

        //     expect(result.status).toBe(0)

        //     // TODO should there be more validations here or should we leave it up to the .exp file?
        // })

        // it('should validate invalid safe configs', async () => {
        //     const result = runExpect('validate-invalid-safe-configs')

        //     expect(result.status).toBe(0) // TODO should not be 0 bc 0 == success

        //     // TODO should there be more validations here or should we leave it up to the .exp file?
        // })
    })

    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_VALIDATE_SAFE_CONFIGS]).not.toBeUndefined()
    })
})
