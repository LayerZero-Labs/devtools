import fc from 'fast-check'
import hre from 'hardhat'
import { expect } from 'chai'
import { Contract } from '@ethersproject/contracts'
import { OmniContractFactory, createErrorParser, PanicError, RevertError, CustomError } from '@layerzerolabs/utils-evm'
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
                    expect.fail(`Expected a promise to always reject but it resolved with ${JSON.stringify(result)}`)
                },
                (error) => error
            )

        before(async () => {
            const contractFactory = await hre.ethers.getContractFactory(CONTRACT_NAME)

            contract = await contractFactory.deploy()
            omniContractFactory = async ({ eid, address }) => ({ eid, contract: contractFactory.attach(address) })
        })

        it('should parse assert/panic', async () => {
            const errorParser = createErrorParser(omniContractFactory)

            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = await assertFailed(contract.throwWithAssert())
                    const omniError: OmniError = { error, point }
                    const parsedError = await errorParser(omniError)

                    expect(parsedError.point).to.eql(point)
                    expect(parsedError.error).to.be.instanceOf(PanicError)
                    expect(parsedError.error.reason).to.eql(BigInt(1))
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

                    expect(parsedError.point).to.eql(point)
                    expect(parsedError.error).to.be.instanceOf(RevertError)
                    expect(parsedError.error.reason).to.eql('my bad')
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

                    expect(parsedError.point).to.eql(point)
                    expect(parsedError.error).to.be.instanceOf(RevertError)
                    expect(parsedError.error.reason).to.eql('my bad')
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

                    expect(parsedError.point).to.eql(point)
                    expect(parsedError.error).to.be.instanceOf(CustomError)
                    expect(parsedError.error.reason).to.eql('CustomErrorWithNoArguments')
                    expect((parsedError.error as CustomError).args).to.eql([])
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

                    expect(parsedError.point).to.eql(point)
                    expect(parsedError.error).to.be.instanceOf(CustomError)
                    expect(parsedError.error.reason).to.eql('CustomErrorWithAnArgument')
                    expect((parsedError.error as CustomError).args).to.eql(['my bad'])
                })
            )
        })

        // FIXME Write tests for throwWithRevertAndNoArguments - in hardhat node they don't seem to revert
        // FIXME Write tests for throwWithRequireAndNoArguments - in hardhat node they don't seem to revert
    })
})
