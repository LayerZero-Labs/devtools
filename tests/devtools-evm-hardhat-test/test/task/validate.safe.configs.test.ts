/// <reference types="jest-extended" />

import hre from 'hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@layerzerolabs/devtools-evm-hardhat'

const validHRE: HardhatRuntimeEnvironment = {
    ...hre,
    userConfig: {
        ...hre.userConfig,
        networks: {
            ...hre.userConfig.networks,
            ethereum: {
                safeConfig: {
                    safeAddress: '0xCDa8e3ADD00c95E5035617F970096118Ca2F4C92',
                    safeUrl: 'https://safe-transaction-mainnet.safe.global/',
                },
            },
        },
    },
}

const invalidHRE: HardhatRuntimeEnvironment = {
    ...hre,
    userConfig: {
        ...hre.userConfig,
        networks: {
            ...hre.userConfig.networks,
            ethereum: {
                safeConfig: {
                    safeAddress: '0x565786AbE5BA0f9D307AdfA681379F0788bEdEf7',
                    safeUrl: 'https://wrong-url.safe.global/',
                },
            },
        },
    },
}

const runSpy = jest.spyOn(hre, 'run')

describe(`task ${TASK_LZ_VALIDATE_SAFE_CONFIGS}`, () => {
    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_VALIDATE_SAFE_CONFIGS]).not.toBeUndefined()
    })

    it('should display failures for invalid safe configs', async () => {
        const isValid = await invalidHRE.run(TASK_LZ_VALIDATE_SAFE_CONFIGS)

        expect(runSpy).toHaveBeenCalled()
        expect(isValid).toBe(false)
    })

    it('should successfully validate valid safe configs', async () => {
        const isValid = await validHRE.run(TASK_LZ_VALIDATE_SAFE_CONFIGS)

        expect(runSpy).toHaveBeenCalled()
        expect(isValid).toBe(true)
    })

    it('should successfully validate no safe configs', async () => {
        const isValid = await hre.run(TASK_LZ_VALIDATE_SAFE_CONFIGS)

        expect(runSpy).toHaveBeenCalled()
        expect(isValid).toBe(true)
    })
})
