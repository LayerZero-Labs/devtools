import { setupDefaultEndpoint } from '../../__utils__/endpoint'
import hre from 'hardhat'
import { isFile, promptToContinue } from '@layerzerolabs/io-utils'
import { resolve } from 'path'
import { TASK_LZ_WIRE_OAPP } from '@layerzerolabs/ua-utils-evm-hardhat'

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
    })

    describe('with invalid configs', () => {
        it('should fail if the config file does not exist', async () => {
            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig: './does-not-exist.js' })).rejects.toThrow(
                /Unable to read config file/
            )
        })

        it('should fail if the config file is not a file', async () => {
            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig: __dirname })).rejects.toThrow(
                /Unable to read config file/
            )
        })

        it('should fail if the config file is not a valid JSON or JS file', async () => {
            const readme = resolve(__dirname, '..', '..', '..', 'README.md')

            expect(isFile(readme)).toBeTruthy()

            await expect(hre.run(TASK_LZ_WIRE_OAPP, { oappConfig: readme })).rejects.toThrow(
                /Unable to read config file/
            )
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
    })

    describe('with valid configs', () => {
        it('should ask the user whether they want to continue', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            promptToContinueMock.mockResolvedValue(true)

            await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(promptToContinueMock).toHaveBeenCalledTimes(1)
        })

        it('should return undefined if the user decides not to continue', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            promptToContinueMock.mockResolvedValue(false)

            const result = await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(result).toBeUndefined()
        })

        it('should return a list of transactions if the user decides to continue', async () => {
            const oappConfig = configPathFixture('valid.config.empty.js')

            promptToContinueMock.mockResolvedValue(true)

            const result = await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })

            expect(result).toEqual([])
        })
    })
})
