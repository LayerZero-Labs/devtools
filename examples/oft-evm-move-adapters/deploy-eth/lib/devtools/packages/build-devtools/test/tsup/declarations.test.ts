import { createDeclarationBuild } from '@/tsup'
import fc from 'fast-check'
import { spawnSync } from 'child_process'

jest.mock('child_process', () => ({
    ...jest.requireActual('child_process'),
    spawnSync: jest.fn().mockReturnValue(undefined),
}))

const spawnSyncMock = spawnSync as jest.Mock

describe('tsup/declarations', () => {
    let pluginContext: any

    beforeEach(() => {
        pluginContext = {
            logger: {
                info: jest.fn(),
                error: jest.fn(),
            },
            options: {},
        }

        spawnSyncMock.mockReset()
    })

    describe('if not enabled explicitly', () => {
        it('should not run tsc', async () => {
            const plugin = createDeclarationBuild({ enabled: false })

            await plugin.buildEnd.call(pluginContext)

            expect(spawnSyncMock).not.toHaveBeenCalled()
        })
    })

    describe('if enabled explicitly', () => {
        it('should run tsc', async () => {
            const plugin = createDeclarationBuild({ enabled: true })

            spawnSyncMock.mockReturnValue({ status: 0 })

            await plugin.buildEnd.call(pluginContext)

            expect(spawnSyncMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('if not in production environment', () => {
        let NODE_ENV: string | undefined

        beforeAll(() => {
            NODE_ENV = process.env.NODE_ENV
        })

        afterAll(() => {
            process.env.NODE_ENV = NODE_ENV
        })

        it('should run tsc', async () => {
            const plugin = createDeclarationBuild({ enabled: undefined })

            spawnSyncMock.mockReturnValue({ status: 0 })

            await plugin.buildEnd.call(pluginContext)

            expect(spawnSyncMock).toHaveBeenCalledTimes(1)
        })

        it('should run tsc and throw if the process fails', async () => {
            const plugin = createDeclarationBuild({ enabled: undefined })

            spawnSyncMock.mockReturnValue({ status: 1 })

            await expect(plugin.buildEnd.call(pluginContext)).rejects.toThrow(
                `Declaration map generation failed with exit code 1`
            )

            expect(spawnSyncMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('if in production environment', () => {
        let NODE_ENV: string | undefined

        beforeAll(() => {
            NODE_ENV = process.env.NODE_ENV

            process.env.NODE_ENV = 'production'
        })

        afterAll(() => {
            process.env.NODE_ENV = NODE_ENV
        })

        it('should not run tsc', async () => {
            await fc.assert(
                fc.asyncProperty(fc.oneof(fc.string(), fc.constantFrom(undefined)), async (env) => {
                    fc.pre(env !== 'production')

                    const plugin = createDeclarationBuild({ enabled: undefined })

                    await plugin.buildEnd.call(pluginContext)

                    expect(spawnSyncMock).not.toHaveBeenCalled()
                })
            )
        })
    })
})
