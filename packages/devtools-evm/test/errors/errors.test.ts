import { CustomError, PanicError, RevertError, UnknownError } from '@/errors'
import { printJson } from '@layerzerolabs/io-devtools'
import fc from 'fast-check'

describe('errors/errors', () => {
    const messageArbitrary = fc.string()

    describe('UnknownError', () => {
        it('should serialize correctly when message is not passed', () => {
            expect(String(new UnknownError())).toBe(`UnknownError: Unknown contract error`)
        })

        it('should serialize correctly when message is empty', () => {
            expect(String(new UnknownError(''))).toBe(`UnknownError`)
        })

        it('should serialize correctly with a message', () => {
            fc.assert(
                fc.property(messageArbitrary, (message) => {
                    fc.pre(message !== '')

                    expect(String(new UnknownError(message))).toBe(`UnknownError: ${message}`)
                })
            )
        })
    })

    describe('PanicError', () => {
        const reasonArbitrary = fc.bigInt()

        it('should serialize correctly when message is not passed', () => {
            fc.assert(
                fc.property(reasonArbitrary, (reason) => {
                    expect(String(new PanicError(reason))).toBe(
                        `PanicError: Contract panicked (assert() has been called). Error code ${reason}`
                    )
                })
            )
        })

        it('should serialize correctly when message is empty', () => {
            fc.assert(
                fc.property(reasonArbitrary, (reason) => {
                    expect(String(new PanicError(reason, ''))).toBe(`PanicError. Error code ${reason}`)
                })
            )
        })

        it('should serialize correctly with a message', () => {
            fc.assert(
                fc.property(reasonArbitrary, messageArbitrary, (reason, message) => {
                    fc.pre(message !== '')

                    expect(String(new PanicError(reason, message))).toBe(`PanicError: ${message}. Error code ${reason}`)
                })
            )
        })
    })

    describe('RevertError', () => {
        const reasonArbitrary = fc.string()

        it('should serialize correctly when message is not passed', () => {
            fc.assert(
                fc.property(reasonArbitrary, (reason) => {
                    expect(String(new RevertError(reason))).toBe(
                        `RevertError: Contract reverted. Error reason '${reason}'`
                    )
                })
            )
        })

        it('should serialize correctly when message is empty', () => {
            fc.assert(
                fc.property(reasonArbitrary, (reason) => {
                    expect(String(new RevertError(reason, ''))).toBe(`RevertError. Error reason '${reason}'`)
                })
            )
        })

        it('should serialize correctly with a message', () => {
            fc.assert(
                fc.property(reasonArbitrary, messageArbitrary, (reason, message) => {
                    fc.pre(message !== '')

                    expect(String(new RevertError(reason, message))).toBe(
                        `RevertError: ${message}. Error reason '${reason}'`
                    )
                })
            )
        })
    })

    describe('CustomError', () => {
        const reasonArbitrary = fc.string()
        const argArbitrary = fc.jsonValue()
        const argsArbitrary = fc.array(argArbitrary)

        it('should serialize correctly when args are empty', () => {
            fc.assert(
                fc.property(reasonArbitrary, (reason) => {
                    expect(String(new CustomError(reason, []))).toBe(
                        `CustomError: Contract reverted with custom error. Error ${reason}()`
                    )
                })
            )
        })

        it('should serialize correctly when message is not passed', () => {
            fc.assert(
                fc.property(reasonArbitrary, argsArbitrary, (reason, args) => {
                    const formattedArgs = args.map((arg) => printJson(arg, false))

                    expect(String(new CustomError(reason, args))).toBe(
                        `CustomError: Contract reverted with custom error. Error ${reason}(${formattedArgs})`
                    )
                })
            )
        })

        it('should serialize correctly when message is empty', () => {
            fc.assert(
                fc.property(reasonArbitrary, argsArbitrary, (reason, args) => {
                    const formattedArgs = args.map((arg) => printJson(arg, false))

                    expect(String(new CustomError(reason, args, ''))).toBe(
                        `CustomError. Error ${reason}(${formattedArgs})`
                    )
                })
            )
        })

        it('should serialize correctly with a message', () => {
            fc.assert(
                fc.property(reasonArbitrary, argsArbitrary, messageArbitrary, (reason, args, message) => {
                    fc.pre(message !== '')

                    const formattedArgs = args.map((arg) => printJson(arg, false))

                    expect(String(new CustomError(reason, args, message))).toBe(
                        `CustomError: ${message}. Error ${reason}(${formattedArgs})`
                    )
                })
            )
        })
    })
})
