import fc from 'fast-check'
import 'hardhat'
import { JsonRpcProvider, Web3Provider } from '@ethersproject/providers'
import { createConnectedContractFactory } from '@/omnigraph'
import { pointArbitrary } from '@layerzerolabs/test-devtools'
import { Contract } from '@ethersproject/contracts'
import { makeZeroAddress } from '@layerzerolabs/devtools-evm'

// Ethers calls the eth_chainId RPC method when initializing a provider so we mock the result
jest.spyOn(Web3Provider.prototype, 'send').mockResolvedValue('1')
jest.spyOn(JsonRpcProvider.prototype, 'send').mockResolvedValue('1')

describe('omnigraph/contracts', () => {
    describe('createConnectedContractFactory', () => {
        it('should reject if contractFactory rejects', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = new Error()
                    const contractFactory = jest.fn().mockRejectedValue(error)
                    const connectedContractFactory = createConnectedContractFactory(contractFactory)

                    await expect(connectedContractFactory(point)).rejects.toBe(error)
                })
            )
        })

        it('should reject if providerFactory rejects', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const error = new Error()
                    const contractFactory = jest.fn().mockResolvedValue(new Contract(makeZeroAddress(undefined), []))
                    const providerFactory = jest.fn().mockRejectedValue(error)
                    const connectedContractFactory = createConnectedContractFactory(contractFactory, providerFactory)

                    await expect(connectedContractFactory(point)).rejects.toBe(error)
                })
            )
        })

        it('should return a connected contract', async () => {
            await fc.assert(
                fc.asyncProperty(pointArbitrary, async (point) => {
                    const contract = new Contract(makeZeroAddress(undefined), [])
                    const provider = new JsonRpcProvider()
                    const contractFactory = jest.fn().mockResolvedValue({ eid: point.eid, contract })
                    const providerFactory = jest.fn().mockResolvedValue(provider)
                    const connectedContractFactory = createConnectedContractFactory(contractFactory, providerFactory)

                    const connectedOmniContract = await connectedContractFactory(point)

                    expect(connectedOmniContract.eid).toBe(point.eid)
                    expect(connectedOmniContract.contract).not.toBe(contract)
                    expect(connectedOmniContract.contract).toBeInstanceOf(Contract)
                    expect(connectedOmniContract.contract.provider).toBe(provider)
                })
            )
        })
    })
})
