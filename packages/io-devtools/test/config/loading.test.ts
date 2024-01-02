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
})
