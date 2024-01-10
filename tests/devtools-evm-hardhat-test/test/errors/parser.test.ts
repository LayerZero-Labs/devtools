import fc from 'fast-check'
import 'hardhat'
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber'
import { Contract } from '@ethersproject/contracts'
import { CustomError, UnknownError } from '@layerzerolabs/devtools-evm'
import { createConnectedContractFactory, createErrorParser } from '@layerzerolabs/devtools-evm-hardhat'
import { OmniError } from '@layerzerolabs/devtools'
import { pointArbitrary } from '@layerzerolabs/test-devtools'
import { getHreByNetworkName, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'

describe('errors/parser', () => {
    describe('createErrorParser', () => {
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
            // Get the environment
            const env = await getHreByNetworkName('britney')
            const eid = getEidForNetworkName('britney')

            // Deploy a fixture
            await env.deployments.fixture(['Thrower'])

            // And get the contract
            const contractFactory = createConnectedContractFactory()
            const omniContract = await contractFactory({ contractName: 'Thrower', eid })

            contract = omniContract.contract
        })

        it('should parse a custom an error with no arguments coming from the contract itself', async () => {
            const errorParser = createErrorParser()

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

        it('should parse a custom an error with an argument coming from the contract itself', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.string(), async (point, arg) => {
                    const error = await assertFailed(contract.throwWithCustomErrorAndArgument(arg))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CustomErrorWithAnArgument')
                    expect((parsedError.error as CustomError).args).toEqual([arg])
                })
            )
        })

        it('should parse a custom an error with no arguments coming from a nested contract', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwNestedWithCustomErrorAndNoArguments())
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('NestedCustomErrorWithNoArguments')
                    expect((parsedError.error as CustomError).args).toEqual([])
                })
            )
        })

        it('should parse a custom an error with an argument coming from a nested contract', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.string(), async (point, arg) => {
                    const error = await assertFailed(contract.throwNestedWithCustomErrorAndArgument(arg))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('NestedCustomErrorWithAnArgument')
                    expect((parsedError.error as CustomError).args).toEqual([arg])
                })
            )
        })

        it('should parse a custom an error with no arguments defined in more contracts coming from the contract itself', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithCommonErrorAndNoArguments())
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CommonErrorWithNoArguments')
                    expect((parsedError.error as CustomError).args).toEqual([])
                })
            )
        })

        it('should parse a custom an error with an different arguments defined in more contracts coming from the contract itself', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.string(), async (point, arg) => {
                    const error = await assertFailed(contract.throwWithCommonErrorAndArgument(arg))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CommonErrorWithAnArgument')
                    expect((parsedError.error as CustomError).args).toEqual([arg])
                })
            )
        })

        it('should parse a custom an error defined in more contracts coming from a nested contract', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwNestedWithCommonErrorAndNoArguments())
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CommonErrorWithNoArguments')
                    expect((parsedError.error as CustomError).args).toEqual([])
                })
            )
        })

        it('should parse a custom an error with different arguments defined in more contracts coming from a nested contract', async () => {
            const errorParser = createErrorParser()

            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.integer({ min: 0 }), async (point, arg) => {
                    const error = await assertFailed(contract.throwNestedWithCommonErrorAndArgument(arg))
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).toEqual(point)
                    expect(parsedError.error).toBeInstanceOf(CustomError)
                    expect(parsedError.error.reason).toEqual('CommonErrorWithAnArgument')
                    expect((parsedError.error as CustomError).args).toEqual([BigNumber.from(arg)])
                })
            )
        })

        it('should never reject', async () => {
            const errorParser = createErrorParser()

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
    })
})
