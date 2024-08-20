import fc from 'fast-check'
import { evmAddressArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { ERC20 } from '@/erc20/sdk'
import { JsonRpcProvider } from '@ethersproject/providers'

describe('erc20/sdk', () => {
    describe('getName', () => {
        it('should return the contract name', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.string(), async (point, name) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new ERC20(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('name', [name])
                    )

                    await expect(sdk.getName()).resolves.toBe(name)
                })
            )
        })
    })

    describe('getSymbol', () => {
        it('should return the contract symbol', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.string(), async (point, symbol) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new ERC20(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('symbol', [symbol])
                    )

                    await expect(sdk.getSymbol()).resolves.toBe(symbol)
                })
            )
        })
    })

    describe('getDecimals', () => {
        it('should return the contract decimals', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, fc.integer({ min: 1, max: 255 }), async (point, decimals) => {
                    const provider = new JsonRpcProvider()
                    const sdk = new ERC20(provider, point)

                    jest.spyOn(provider, 'call').mockResolvedValue(
                        sdk.contract.contract.interface.encodeFunctionResult('decimals', [decimals])
                    )

                    await expect(sdk.getDecimals()).resolves.toBe(decimals)
                })
            )
        })
    })

    describe('getBalanceOf', () => {
        it('should return the user balance', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    evmAddressArbitrary,
                    fc.bigInt({ min: BigInt(0) }),
                    async (point, user, balance) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new ERC20(provider, point)

                        jest.spyOn(provider, 'call').mockResolvedValue(
                            sdk.contract.contract.interface.encodeFunctionResult('balanceOf', [balance])
                        )

                        await expect(sdk.getBalanceOf(user)).resolves.toBe(balance)
                    }
                )
            )
        })
    })

    describe('getAllowance', () => {
        it('should return the user balance', async () => {
            await fc.assert(
                fc.asyncProperty(
                    pointArbitrary,
                    evmAddressArbitrary,
                    evmAddressArbitrary,
                    fc.bigInt({ min: BigInt(0) }),
                    async (point, owner, spender, allowance) => {
                        const provider = new JsonRpcProvider()
                        const sdk = new ERC20(provider, point)

                        jest.spyOn(provider, 'call').mockResolvedValue(
                            sdk.contract.contract.interface.encodeFunctionResult('allowance', [allowance])
                        )

                        await expect(sdk.getAllowance(owner, spender)).resolves.toBe(allowance)
                    }
                )
            )
        })
    })
})
