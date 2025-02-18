import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { Contract } from '@ethersproject/contracts'
import { ERC20 } from '@/erc20/sdk'
import { OmniContract } from '@layerzerolabs/devtools-evm'
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber'

describe('erc20/sdk', () => {
    const jestFunctionArbitrary = fc.anything().map(() => jest.fn())

    const erc20ContractArbitrary = fc.record({
        address: evmAddressArbitrary,
        name: jestFunctionArbitrary,
        decimals: jestFunctionArbitrary,
        symbol: jestFunctionArbitrary,
        allowance: jestFunctionArbitrary,
        balanceOf: jestFunctionArbitrary,
        interface: fc.record({
            encodeFunctionData: jestFunctionArbitrary,
        }),
    }) as fc.Arbitrary<unknown> as fc.Arbitrary<Contract>

    const omniContractArbitrary: fc.Arbitrary<OmniContract> = fc.record({
        eid: endpointArbitrary,
        contract: erc20ContractArbitrary,
    })

    describe('getName', () => {
        it('should return the contract name', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, fc.string(), async (omniContract, name) => {
                    omniContract.contract.name.mockResolvedValue(name)

                    const sdk = new ERC20(omniContract)

                    await expect(sdk.getName()).resolves.toBe(name)

                    expect(omniContract.contract.name).toHaveBeenCalledTimes(1)
                })
            )
        })
    })

    describe('getSymbol', () => {
        it('should return the contract symbol', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, fc.string(), async (omniContract, symbol) => {
                    omniContract.contract.symbol.mockResolvedValue(symbol)

                    const sdk = new ERC20(omniContract)

                    await expect(sdk.getSymbol()).resolves.toBe(symbol)

                    expect(omniContract.contract.symbol).toHaveBeenCalledTimes(1)
                })
            )
        })
    })

    describe('getDecimals', () => {
        it('should return the contract decimals', async () => {
            await fc.assert(
                fc.asyncProperty(omniContractArbitrary, fc.integer({ min: 1 }), async (omniContract, decimals) => {
                    omniContract.contract.decimals.mockResolvedValue(decimals)

                    const sdk = new ERC20(omniContract)

                    await expect(sdk.getDecimals()).resolves.toBe(decimals)

                    expect(omniContract.contract.decimals).toHaveBeenCalledTimes(1)
                })
            )
        })
    })

    describe('getBalanceOf', () => {
        it('should return the user balance', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    evmAddressArbitrary,
                    fc.bigInt({ min: BigInt(0) }),
                    async (omniContract, user, balance) => {
                        omniContract.contract.balanceOf.mockResolvedValue(BigNumber.from(balance))

                        const sdk = new ERC20(omniContract)

                        await expect(sdk.getBalanceOf(user)).resolves.toBe(balance)

                        expect(omniContract.contract.balanceOf).toHaveBeenCalledTimes(1)
                        expect(omniContract.contract.balanceOf).toHaveBeenCalledWith(user)
                    }
                )
            )
        })
    })

    describe('getAllowance', () => {
        it('should return the user balance', async () => {
            await fc.assert(
                fc.asyncProperty(
                    omniContractArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    fc.bigInt({ min: BigInt(0) }),
                    async (omniContract, owner, spender, allowance) => {
                        omniContract.contract.allowance.mockResolvedValue(BigNumber.from(allowance))

                        const sdk = new ERC20(omniContract)

                        await expect(sdk.getAllowance(owner, spender)).resolves.toBe(allowance)

                        expect(omniContract.contract.allowance).toHaveBeenCalledTimes(1)
                        expect(omniContract.contract.allowance).toHaveBeenCalledWith(owner, spender)
                    }
                )
            )
        })
    })
})
