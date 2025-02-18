import fc from 'fast-check'
import 'hardhat'
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber'
import { Contract } from '@ethersproject/contracts'
import { CustomError, UnknownError } from '@layerzerolabs/devtools-evm'
import { createConnectedContractFactory, createErrorParser } from '@layerzerolabs/devtools-evm-hardhat'
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

            // Deploy the contract
            await env.deployments.run(['Thrower'])

            // And get the contract
            const contractFactory = createConnectedContractFactory()
            const omniContract = await contractFactory({ contractName: 'Thrower', eid })

            contract = omniContract.contract
        })

        it('should parse a custom an error with no arguments coming from the contract itself', async () => {
            const errorParser = await createErrorParser()
            const error = await assertFailed(contract.throwWithCustomErrorAndNoArguments())
            const parsedError = await errorParser(error)

            expect(parsedError).toEqual(new CustomError('CustomErrorWithNoArguments', []))
        })

        it('should parse a custom an error with an argument coming from the contract itself', async () => {
            const errorParser = await createErrorParser()

            await fc.assert(
                fc.asyncProperty(fc.string(), async (arg) => {
                    const error = await assertFailed(contract.throwWithCustomErrorAndArgument(arg))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new CustomError('CustomErrorWithAnArgument', [arg]))
                })
            )
        })

        it('should parse a custom an error with no arguments coming from a nested contract', async () => {
            const errorParser = await createErrorParser()
            const error = await assertFailed(contract.throwNestedWithCustomErrorAndNoArguments())
            const parsedError = await errorParser(error)

            expect(parsedError).toEqual(new CustomError('NestedCustomErrorWithNoArguments', []))
        })

        it('should parse a custom an error with an argument coming from a nested contract', async () => {
            const errorParser = await createErrorParser()

            await fc.assert(
                fc.asyncProperty(fc.string(), async (arg) => {
                    const error = await assertFailed(contract.throwNestedWithCustomErrorAndArgument(arg))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new CustomError('NestedCustomErrorWithAnArgument', [arg]))
                })
            )
        })

        it('should parse a custom an error with no arguments defined in more contracts coming from the contract itself', async () => {
            const errorParser = await createErrorParser()
            const error = await assertFailed(contract.throwWithCommonErrorAndNoArguments())
            const parsedError = await errorParser(error)

            expect(parsedError).toEqual(new CustomError('CommonErrorWithNoArguments', []))
        })

        it('should parse a custom an error with an different arguments defined in more contracts coming from the contract itself', async () => {
            const errorParser = await createErrorParser()

            await fc.assert(
                fc.asyncProperty(fc.string(), async (arg) => {
                    const error = await assertFailed(contract.throwWithCommonErrorAndArgument(arg))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new CustomError('CommonErrorWithAnArgument', [arg]))
                })
            )
        })

        it('should parse a custom an error defined in more contracts coming from a nested contract', async () => {
            const errorParser = await createErrorParser()
            const error = await assertFailed(contract.throwNestedWithCommonErrorAndNoArguments())
            const parsedError = await errorParser(error)

            expect(parsedError).toEqual(new CustomError('CommonErrorWithNoArguments', []))
        })

        it('should parse a custom an error with different arguments defined in more contracts coming from a nested contract', async () => {
            const errorParser = await createErrorParser()

            await fc.assert(
                fc.asyncProperty(fc.integer({ min: 0 }), async (arg) => {
                    const error = await assertFailed(contract.throwNestedWithCommonErrorAndArgument(arg))
                    const parsedError = await errorParser(error)

                    expect(parsedError).toEqual(new CustomError('CommonErrorWithAnArgument', [BigNumber.from(arg)]))
                })
            )
        })

        it('should never reject', async () => {
            const errorParser = await createErrorParser()

            await fc.assert(
                fc.asyncProperty(fc.anything(), async (error) => {
                    const parsedError = await errorParser(error)

                    expect(parsedError).toBeInstanceOf(UnknownError)
                    expect(parsedError.reason).toBeUndefined()
                    expect(parsedError.message).toMatch(/Unknown error: /)
                })
            )
        })
    })
})
