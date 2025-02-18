import fc from 'fast-check'
import hre from 'hardhat'
import { Contract } from '@ethersproject/contracts'
import {
    createContractErrorParser,
    PanicError,
    RevertError,
    CustomError,
    UnknownError,
} from '@layerzerolabs/devtools-evm'
import { endpointArbitrary } from '@layerzerolabs/test-devtools'

describe('errors/parser', () => {
    describe('createContractErrorParser', () => {
        const CONTRACT_NAME = 'Thrower'

        let contract: Contract

        /**
         * Helper utility that swaps the promise resolution for rejection and other way around
         *
         * This is useful for the below tests since we are testing that promises reject
         * and want to get their rejection values.
         *
         * @param promise `Promise<unknown>`
         *
         * @returns `Promise<unknown>`
         */
        const assertFailed = async (promise: Promise<unknown>): Promise<unknown> =>
            promise.then(
                (result) => {
                    throw new Error(
                        `Expected a promise to always reject but it resolved with ${JSON.stringify(result)}`
                    )
                },
                (error) => error
            )

        beforeAll(async () => {
            const contractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)

            contract = await contractFactory.deploy()
        })

        it('should pass an error through if it already is a ContractError', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = new RevertError('A reason is worth a million bytes')
                    const parsedError = await errorParser(error)

                    expect(parsedError).toBe(error)
                })
            )
        })

        it('should parse assert/panic', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = await assertFailed(contract.throwWithAssert())
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new PanicError(BigInt(1)))
                })
            )
        })

        it('should parse assert/panic with code', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = await assertFailed(contract.throwWithAssertWithCode())
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new PanicError(BigInt(18)))
                })
            )
        })

        it('should parse revert with arguments', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = await assertFailed(contract.throwWithRevertAndArgument('my bad'))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new RevertError('my bad'))
                })
            )
        })

        it('should parse require with an argument', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = await assertFailed(contract.throwWithRequireAndArgument('my bad'))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new RevertError('my bad'))
                })
            )
        })

        it('should parse require with a custom error with no arguments', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = await assertFailed(contract.throwWithCustomErrorAndNoArguments())
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new CustomError('CustomErrorWithNoArguments', []))
                })
            )
        })

        it('should parse require with a custom error with an argument', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, fc.string(), async (eid, arg) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = await assertFailed(contract.throwWithCustomErrorAndArgument(arg))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new CustomError('CustomErrorWithAnArgument', [arg]))
                })
            )
        })

        it('should parse string', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, fc.string(), async (eid, message) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const parsedError = await errorParser(message)

                    expect(parsedError).toEqual(new UnknownError(`Unknown error: ${message}`))
                })
            )
        })

        it('should parse an Error', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, fc.string(), async (eid, message) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const error = new Error(message)
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new UnknownError(`Unknown error: ${error}`))
                })
            )
        })

        it('should never reject', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, fc.anything(), async (eid, error) => {
                    const errorParser = await createContractErrorParser({ contract, eid })
                    const parsedError = await errorParser(error)

                    expect(parsedError).toBeInstanceOf(UnknownError)
                    expect(parsedError.reason).toBeUndefined()
                    expect(parsedError.message).toMatch(/Unknown error: /)
                })
            )
        })

        // FIXME Write tests for throwWithRevertAndNoArguments - in hardhat node they don't seem to revert
        // FIXME Write tests for throwWithRequireAndNoArguments - in hardhat node they don't seem to revert
    })
})
