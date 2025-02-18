import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createSignerAddressOrIndexFactory, createSignerFactory } from '@/transactions/signer'
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers'
import { OmniSignerEVM } from '@layerzerolabs/devtools-evm'
import fc from 'fast-check'
import { endpointArbitrary } from '@layerzerolabs/test-devtools'
import { evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { formatEid } from '@layerzerolabs/devtools'

// Ethers calls the eth_chainId RPC method when initializing a provider so we mock the result
jest.spyOn(JsonRpcProvider.prototype, 'detectNetwork').mockResolvedValue({ chainId: 1, name: 'mock' })

describe('signer', () => {
    describe('createSignerFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createSignerFactory()(EndpointId.CATHAY_TESTNET)).rejects.toBeTruthy()
        })

        it('should return an OmniSignerEVM', async () => {
            const signer = await createSignerFactory()(EndpointId.ETHEREUM_V2_MAINNET)

            expect(signer).toBeInstanceOf(OmniSignerEVM)
            expect(signer.signer).toBeInstanceOf(JsonRpcSigner)
            expect(signer.signer.provider).toBeInstanceOf(JsonRpcProvider)

            // Ethers has this ugly habit of importing files here and there,
            // firing RPC requests and all.
            //
            // If we don't wait for the provider to be ready, jest will complain
            // about requests being made after test teardown
            await (signer.signer.provider as JsonRpcProvider)?.ready
        })
    })

    describe('createSignerAddressOrIndexFactory', () => {
        it('should return undefined if called with undefined definition', async () => {
            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    await expect(createSignerAddressOrIndexFactory()(eid)).resolves.toBeUndefined()
                })
            )
        })

        it('should return address if called with address definition', async () => {
            await fc.assert(
                fc.asyncProperty(evmAddressArbitrary, endpointArbitrary, async (address, eid) => {
                    await expect(createSignerAddressOrIndexFactory({ type: 'address', address })(eid)).resolves.toBe(
                        address
                    )
                })
            )
        })

        it('should return index if called with index definition', async () => {
            await fc.assert(
                fc.asyncProperty(fc.integer(), endpointArbitrary, async (index, eid) => {
                    await expect(createSignerAddressOrIndexFactory({ type: 'index', index })(eid)).resolves.toBe(index)
                })
            )
        })

        it('should reject if called with a missing named definition', async () => {
            const mockGetNamedAccounts = jest.fn().mockResolvedValue({ wombat: '0xwombat' })
            const mockHre = {
                getNamedAccounts: mockGetNamedAccounts,
            }
            const hreFactory = jest.fn().mockResolvedValue(mockHre)

            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    await expect(
                        createSignerAddressOrIndexFactory({ type: 'named', name: 'no-wombat' }, hreFactory)(eid)
                    ).rejects.toThrow(`Missing named account 'no-wombat' for eid ${formatEid(eid)}`)
                })
            )
        })

        it('should resolve with an address if called with a defined named definition', async () => {
            const mockGetNamedAccounts = jest.fn().mockResolvedValue({ wombat: '0xwombat' })
            const mockHre = {
                getNamedAccounts: mockGetNamedAccounts,
            }
            const hreFactory = jest.fn().mockResolvedValue(mockHre)

            await fc.assert(
                fc.asyncProperty(endpointArbitrary, async (eid) => {
                    await expect(
                        createSignerAddressOrIndexFactory({ type: 'named', name: 'wombat' }, hreFactory)(eid)
                    ).resolves.toBe('0xwombat')
                })
            )
        })
    })
})
