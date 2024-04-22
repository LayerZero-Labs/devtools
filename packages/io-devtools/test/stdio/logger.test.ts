/// <reference types="jest-extended" />

import { Logger, createModuleLogger, createWithAsyncLogger } from '@/stdio'
import fc from 'fast-check'

describe('stdio/logger', () => {
    describe('createWithAsyncLogger()', () => {
        const customLogger = createModuleLogger('my-module')
        const createLoggerMock = jest.fn().mockReturnValue(customLogger)

        describe.each([
            ['default logger', undefined],
            ['custom logger', createLoggerMock],
        ] as const)(`with %s`, (name, loggerFactory) => {
            let withAsyncLogger: ReturnType<typeof createWithAsyncLogger>

            beforeEach(() => {
                withAsyncLogger = createWithAsyncLogger(loggerFactory)
            })

            it('should call onStart & onSuccess when the callback resolves', async () => {
                await fc.assert(
                    fc.asyncProperty(fc.array(fc.anything()), fc.anything(), async (args, returnValue) => {
                        const fn = jest.fn().mockResolvedValue(returnValue)
                        const onStart = jest.fn().mockImplementation((logger: Logger) => logger.debug(`onStart`))
                        const onSuccess = jest.fn().mockImplementation((logger: Logger) => logger.debug(`onSuccess`))

                        await expect(withAsyncLogger(fn, { onStart, onSuccess })(...args)).resolves.toBe(returnValue)

                        expect(onStart).toHaveBeenCalledWith(expect.anything(), args)
                        expect(onSuccess).toHaveBeenCalledWith(expect.anything(), args, returnValue)
                        expect(onStart).toHaveBeenCalledBefore(onSuccess)
                    })
                )
            })

            it('should call onStart & onFailure when callback rejects', async () => {
                await fc.assert(
                    fc.asyncProperty(fc.array(fc.anything()), fc.anything(), async (args, error) => {
                        const fn = jest.fn().mockRejectedValue(error)
                        const onStart = jest.fn().mockImplementation((logger: Logger) => logger.debug(`onStart`))
                        const onError = jest.fn().mockImplementation((logger: Logger) => logger.debug(`onSuccess`))

                        await expect(withAsyncLogger(fn, { onStart, onError })(...args)).rejects.toBe(error)

                        expect(onStart).toHaveBeenCalledWith(expect.anything(), args)
                        expect(onError).toHaveBeenCalledWith(expect.anything(), args, error)
                        expect(onStart).toHaveBeenCalledBefore(onError)
                    })
                )
            })

            it('should resolve if onSuccess call throws', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.array(fc.anything()),
                        fc.anything(),
                        fc.anything(),
                        async (args, returnValue, loggerError) => {
                            const fn = jest.fn().mockResolvedValue(returnValue)
                            const onStart = jest.fn().mockImplementation((logger: Logger) => logger.debug(`onStart`))
                            const onSuccess = jest.fn().mockImplementation(() => {
                                throw loggerError
                            })

                            await expect(withAsyncLogger(fn, { onStart, onSuccess })(...args)).resolves.toBe(
                                returnValue
                            )

                            expect(onStart).toHaveBeenCalledWith(expect.anything(), args)
                            expect(onSuccess).toHaveBeenCalledWith(expect.anything(), args, returnValue)
                            expect(onStart).toHaveBeenCalledBefore(onSuccess)
                        }
                    )
                )
            })

            it('should reject with the original error if onError callback throws', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.array(fc.anything()),
                        fc.anything(),
                        fc.anything(),
                        async (args, error, loggerError) => {
                            const fn = jest.fn().mockRejectedValue(error)
                            const onStart = jest.fn().mockImplementation((logger: Logger) => logger.debug(`onStart`))
                            const onError = jest.fn().mockImplementation(() => {
                                throw loggerError
                            })

                            await expect(withAsyncLogger(fn, { onStart, onError })(...args)).rejects.toBe(error)

                            expect(onStart).toHaveBeenCalledWith(expect.anything(), args)
                            expect(onError).toHaveBeenCalledWith(expect.anything(), args, error)
                            expect(onStart).toHaveBeenCalledBefore(onError)
                        }
                    )
                )
            })
        })
    })
})
