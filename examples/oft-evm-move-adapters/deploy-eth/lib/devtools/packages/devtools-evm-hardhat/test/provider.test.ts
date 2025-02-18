import 'hardhat'
import { createGetHreByEid } from '@/runtime'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createProviderFactory } from '@/provider'
import { JsonRpcProvider } from '@ethersproject/providers'

// Ethers calls the eth_chainId RPC method when initializing a provider so we mock the result
jest.spyOn(JsonRpcProvider.prototype, 'detectNetwork').mockResolvedValue({ chainId: 1, name: 'mock' })

describe('provider', () => {
    describe('createProviderFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            const environmentFactory = createGetHreByEid()
            const providerFactory = createProviderFactory(environmentFactory)

            await expect(providerFactory(EndpointId.CATHAY_TESTNET)).rejects.toBeTruthy()
        })

        it('should return a JsonRpcProvider wrapping the network provider', async () => {
            const environmentFactory = createGetHreByEid()
            const providerFactory = createProviderFactory(environmentFactory)
            const env = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
            const provider = await providerFactory(EndpointId.ETHEREUM_V2_MAINNET)

            expect(provider).toBeInstanceOf(JsonRpcProvider)

            // Here we're checking that the provider is configured with the correct network provider
            jest.spyOn(env.network.provider, 'send').mockResolvedValue('sent')
            expect(await provider.send('dummy', [])).toBe('sent')

            // Ethers has this ugly habit of importing files here and there,
            // firing RPC requests and all.
            //
            // If we don't wait for the provider to be ready, jest will complain
            // about requests being made after test teardown
            await provider.ready
        })
    })
})
