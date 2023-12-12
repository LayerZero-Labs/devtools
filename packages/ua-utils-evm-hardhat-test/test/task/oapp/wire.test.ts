import { setupDefaultEndpoint } from '../../__utils__/endpoint'
import hre from 'hardhat'
import { isFile, promptToContinue } from '@layerzerolabs/io-utils'
import { resolve } from 'path'
import { TASK_LZ_WIRE_OAPP } from '@layerzerolabs/ua-utils-evm-hardhat'
import { deployOApp } from '../../__utils__/oapp'

jest.mock('@layerzerolabs/io-utils', () => {
    const original = jest.requireActual('@layerzerolabs/io-utils')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked'),
    }
})

const promptToContinueMock = promptToContinue as jest.Mock

describe('task/oapp/wire', () => {
    const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'configs')
    const configPathFixture = (fileName: string): string => {
        const path = resolve(CONFIGS_BASE_DIR, fileName)

        expect(isFile(path)).toBeTruthy()

        return path
    }

    beforeEach(async () => {
        promptToContinueMock.mockReset()

        await setupDefaultEndpoint()
        await deployOApp()
    })

    describe('with invalid configs', () => {
        it('should fail if the config file does not exist', async () => {
            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig: './does-not-exist.js' })).rejects.toMatchSnapshot()
        })

        it('should fail if the config file is not a file', async () => {
            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig: __dirname })).rejects.toMatchSnapshot()
        })

        it('should fail if the config file is not a valid JSON or JS file', async () => {
            const readme = resolve(__dirname, '..', '..', '..', 'README.md')

            expect(isFile(readme)).toBeTruthy()

            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig: readme })).rejects.toMatchSnapshot()
        })

        it('should fail with an empty JSON file', async () => {
            const oappConfig = configPathFixture('invalid.config.empty.json')

            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with an empty JS file', async () => {
            const oappConfig = configPathFixture('invalid.config.empty.js')

            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })).rejects.toMatchSnapshot()
        })

        it('should fail with a malformed JS file (001)', async () => {
            const oappConfig = configPathFixture('invalid.config.001.js')

            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })).rejects.toMatchSnapshot()
        })

        it.only('should fail with a misconfigured file (001)', async () => {
            const oappConfig = configPathFixture('valid.config.misconfigured.001.js')

            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })).rejects.toMatchSnapshot()
        })
    })

    describe('with valid configs', () => {
        it('should exit if there is nothing to wire', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should have verbose output if requested (so called eye test, check the test output)', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig, logLevel: 'verbose' })

            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should ask the user whether they want to see the transactions & continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(true)

            await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should return undefined if the user decides not to continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock.mockResolvedValue(false)

            const result = await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(result).toBeUndefined()
            expect(promptToContinueMock).toHaveBeenCalledTimes(2)
        })

        it('should return a list of transactions if the user decides to continue', async () => {
            const oappConfig = configPathFixture('valid.config.connected.js')

            promptToContinueMock
                .mockResolvedValueOnce(false) // We don't want to see the list
                .mockResolvedValueOnce(true) // We want to continue

            const result = await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(result).toEqual([])
        })
    })
})
