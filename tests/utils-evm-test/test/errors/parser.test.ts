import fc from 'fast-check'
import hre from 'hardhat'
import { Contract } from '@ethersproject/contracts'
import {
    createErrorParser,
    PanicError,
    RevertError,
    CustomError,
    UnknownError,
    OmniContractFactory,
} from '@layerzerolabs/utils-evm'
import { OmniError } from '@layerzerolabs/utils'
import { pointArbitrary } from '@layerzerolabs/test-utils'

describe('errors/parser', () => {
    describe('createErrorParser', () => {
        const CONTRACT_NAME = 'Thrower'

        let contract: Contract
        let omniContractFactory: OmniContractFactory

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
                    fail(`Expected a promise to always reject but it resolved with ${JSON.stringify(result)}`)
                },
                (error) => error
            )

        beforeAll(async () => {
            const contractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)

            contract = await contractFactory.deploy()
            omniContractFactory = async ({ eid, address }) => ({ eid, contract: contractFactory.attach(address) })
        })

        it('should pass an error through if it already is a ContractError', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const omniError: OmniError = { error: new RevertError('A reason is worth a million bytes'), point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(RevertError)
                    expect(parsedError.error.reason).toBe('A reason is worth a million bytes')
                })
            )
        })

        it('should parse assert/panic', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithAssert())
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(PanicError)
                    expect(parsedError.error.reason).toEqual(BigInt(1))
                })
            )
        })

        it('should parse revert with arguments', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithRevertAndArgument('my bad'))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(RevertError)
                    expect(parsedError.error.reason).toEqual('my bad')
                })
            )
        })

        it('should parse require with an argument', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithRequireAndArgument('my bad'))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(RevertError)
                    expect(parsedError.error.reason).toEqual('my bad')
                })
            )
        })

        it('should parse require with a custom error with no arguments', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithCustomErrorAndNoArguments())
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CustomErrorWithNoArguments')
                    expect((parsedError.error as CustomError).args).toEqual([])
                })
            )
        })

        it('should parse require with a custom error with an argument', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithCustomErrorAndArgument('my bad'))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CustomErrorWithAnArgument')
                    expect((parsedError.error as CustomError).args).toEqual(['my bad'])
                })
            )
        })

        it('should parse string', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const omniError: OmniError = { error: 'some weird error', point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(UnknownError)
                    expect(parsedError.error.reason).toBeUndefined()
                    expect(parsedError.error.message).toEqual('Unknown error: some weird error')
                })
            )
        })

        it('should parse an Error', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const omniError: OmniError = { error: new Error('some weird error'), point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(UnknownError)
                    expect(parsedError.error.reason).toBeUndefined()
                    expect(parsedError.error.message).toEqual('Unknown error: Error: some weird error')
                })
            )
        })

        it('should never reject', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.anything(), async (point, error) => {
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(UnknownError)
                    expect(parsedError.error.reason).toBeUndefined()
                    expect(parsedError.error.message).toMatch(/Unknown error: /)
                }),
                // Test case for when toString method of the error is not defined
                {
                    seed: 223418789,
                    path: '40:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:1:77:77',
                    endOnFailure: true,
                }
            )
        })

        // FIXME Write tests for throwWithRevertAndNoArguments - in hardhat node they don't seem to revert
        // FIXME Write tests for throwWithRequireAndNoArguments - in hardhat node they don't seem to revert
    })
})
