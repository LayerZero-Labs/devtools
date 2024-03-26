import { createConfigLoader } from '@/config'
import { importDefault, isFile, isReadable } from '@/filesystem/filesystem'
import { z } from 'zod'

jest.mock('@/filesystem/filesystem', () => ({
    isFile: jest.fn().mockReturnValue(false),
    isReadable: jest.fn().mockReturnValue(false),
    importDefault: jest.fn().mockRejectedValue('Not mocked'),
}))

const isFileMock = isFile as jest.Mock
const importDefaultMock = importDefault as jest.Mock
const isReadableMock = isReadable as jest.Mock

describe('config/loading', () => {
    beforeEach(() => {
        isFileMock.mockReset()
        importDefaultMock.mockReset()
        isReadableMock.mockReset()
    })

    describe('createConfigLoader', () => {
        it('should reject if the path is not a file', async () => {
            isFileMock.mockReturnValue(false)

            const configLoader = createConfigLoader(z.unknown())

            await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()
        })

        it('should reject if the path is not readable', async () => {
            isFileMock.mockReturnValue(true)
            isReadableMock.mockReturnValue(false)

            const configLoader = createConfigLoader(z.unknown())

            await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()
        })

        it('should reject if the file cannot be imported', async () => {
            isFileMock.mockReturnValue(true)
            isReadableMock.mockReturnValue(true)
            importDefaultMock.mockRejectedValue('No way')

            const configLoader = createConfigLoader(z.unknown())

            await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()
        })

        describe('when config file exports a config', () => {
            it('should reject if the file contents do not match the schema', async () => {
                isFileMock.mockReturnValue(true)
                isReadableMock.mockReturnValue(true)
                importDefaultMock.mockResolvedValue({ bad: 'config' })

                const schema = z.object({ good: z.string() })
                const configLoader = createConfigLoader(schema)

                await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()
            })

            it('should resolve if the file contents match the schema', async () => {
                isFileMock.mockReturnValue(true)
                isReadableMock.mockReturnValue(true)
                importDefaultMock.mockResolvedValue({ good: 'config' })

                const schema = z.object({ good: z.string() })
                const configLoader = createConfigLoader(schema)

                await expect(configLoader('./myconfig.ts')).resolves.toMatchSnapshot()
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

                    const schema = z.object({ good: z.string() })
                    const configLoader = createConfigLoader(schema)

                    await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should reject if the function returns an invalid config', async () => {
                    const configFunctionMock = jest.fn().mockReturnValue({ bad: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    const schema = z.object({ good: z.string() })
                    const configLoader = createConfigLoader(schema)

                    await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should resolve if the function returns a valid config', async () => {
                    const configFunctionMock = jest.fn().mockReturnValue({ good: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    const schema = z.object({ good: z.string() })
                    const configLoader = createConfigLoader(schema)

                    await expect(configLoader('./myconfig.ts')).resolves.toEqual({ good: 'config' })

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

                    const schema = z.object({ good: z.string() })
                    const configLoader = createConfigLoader(schema)

                    await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should reject if the function resolves with an invalid config', async () => {
                    const configFunctionMock = jest.fn().mockResolvedValue({ bad: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    const schema = z.object({ good: z.string() })
                    const configLoader = createConfigLoader(schema)

                    await expect(configLoader('./myconfig.ts')).rejects.toMatchSnapshot()

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })

                it('should resolve if the function returns a valid config', async () => {
                    const configFunctionMock = jest.fn().mockResolvedValue({ good: 'config' })

                    isFileMock.mockReturnValue(true)
                    isReadableMock.mockReturnValue(true)
                    importDefaultMock.mockResolvedValue(configFunctionMock)

                    const schema = z.object({ good: z.string() })
                    const configLoader = createConfigLoader(schema)

                    await expect(configLoader('./myconfig.ts')).resolves.toEqual({ good: 'config' })

                    expect(configFunctionMock).toHaveBeenCalledTimes(1)
                    expect(configFunctionMock).toHaveBeenCalledWith()
                })
            })
        })
    })
})
