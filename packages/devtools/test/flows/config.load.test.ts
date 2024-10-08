import { createConfigLoadFlow } from '@/flows/config.load'
import { importDefault, isFile, isReadable } from '@layerzerolabs/io-devtools'
import { z } from 'zod'

jest.mock('@layerzerolabs/io-devtools', () => ({
    ...jest.requireActual('@layerzerolabs/io-devtools'),
    isFile: jest.fn().mockReturnValue(false),
    isReadable: jest.fn().mockReturnValue(false),
    importDefault: jest.fn().mockRejectedValue('Not mocked'),
}))

const isFileMock = isFile as jest.Mock
const importDefaultMock = importDefault as jest.Mock
const isReadableMock = isReadable as jest.Mock

describe('flows/config.load', () => {
    beforeEach(() => {
        isFileMock.mockReset()
        importDefaultMock.mockReset()
        isReadableMock.mockReset()
    })

    describe('createConfigLoadFlow', () => {
        it('should reject if the path is not a file', async () => {
            isFileMock.mockReturnValue(false)

            await expect(
                createConfigLoadFlow({ configSchema: z.unknown() })({ configPath: './myconfig.ts' })
            ).rejects.toMatchSnapshot()
        })

        it('should reject if the path is not readable', async () => {
            isFileMock.mockReturnValue(true)
            isReadableMock.mockReturnValue(false)

            await expect(
                createConfigLoadFlow({ configSchema: z.unknown() })({ configPath: './myconfig.ts' })
            ).rejects.toMatchSnapshot()
        })

        it('should reject if the file cannot be imported', async () => {
            isFileMock.mockReturnValue(true)
            isReadableMock.mockReturnValue(true)
            importDefaultMock.mockRejectedValue('No way')

            await expect(
                createConfigLoadFlow({ configSchema: z.unknown() })({
                    configPath: './myconfig.ts',
                })
            ).rejects.toMatchSnapshot()
        })

        describe('when config file exports a config', () => {
            it('should reject if the file contents do not match the schema', async () => {
                isFileMock.mockReturnValue(true)
                isReadableMock.mockReturnValue(true)
                importDefaultMock.mockResolvedValue({ bad: 'config' })

                await expect(
                    createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                        configPath: './myconfig.ts',
                    })
                ).rejects.toMatchSnapshot()
            })

            it('should resolve if the file contents match the schema', async () => {
                isFileMock.mockReturnValue(true)
                isReadableMock.mockReturnValue(true)
                importDefaultMock.mockResolvedValue({ good: 'config' })

                await expect(
                    createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                        configPath: './myconfig.ts',
                    })
                ).resolves.toMatchSnapshot()
            })
        })

        describe('when config file exports a function', () => {
            describe('when it is a synchronous function', () => {
                it('should reject if the function throws an error', async () => {
                    const configFunctionMock = jest.fn(() => {
                        throw new Error('Oh not again')
                    })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    await expect(
                        createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                            configPath: './myconfig.ts',
                        })
                    ).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should reject if the function returns an invalid config', async () => {
                    const configFunctionMock = jest.fn().mockReturnValue({ bad: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    await expect(
                        createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                            configPath: './myconfig.ts',
                        })
                    ).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should resolve if the function returns a valid config', async () => {
                    const configFunctionMock = jest.fn().mockReturnValue({ good: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    await expect(
                        createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                            configPath: './myconfig.ts',
                        })
                    ).resolves.toEqual({ good: 'config' })

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })
            })

            describe('when it is an asynchronous function', () => {
                it('should reject if the function rejects', async () => {
                    const configFunctionMock = jest.fn().mockRejectedValue(new Error('Y u do dis'))

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    await expect(
                        createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                            configPath: './myconfig.ts',
                        })
                    ).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should reject if the function resolves with an invalid config', async () => {
                    const configFunctionMock = jest.fn().mockResolvedValue({ bad: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    await expect(
                        createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                            configPath: './myconfig.ts',
                        })
                    ).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should resolve if the function returns a valid config', async () => {
                    const configFunctionMock = jest.fn().mockResolvedValue({ good: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    await expect(
                        createConfigLoadFlow({ configSchema: z.object({ good: z.string() }) })({
                            configPath: './myconfig.ts',
                        })
                    ).resolves.toEqual({ good: 'config' })

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })
            })
        })
    })
})
