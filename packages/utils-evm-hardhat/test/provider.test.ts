import { getNetworkRuntimeEnvironment } from '../src/runtime'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createProviderFactory } from '../src/provider'
import { Web3Provider } from '@ethersproject/providers'

// Ethers calls the eth_chainId RPC method when initializing a provider so we mock the result
jest.spyOn(Web3Provider.prototype, 'send').mockResolvedValue('1')

describe('provider', () => {
    // Web3Provider.prototype.s
    describe('createProviderFactory', () => {
        beforeAll(() => {})

        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createProviderFactory(hre)(EndpointId.CATHAY_TESTNET)).rejects.toBeTruthy()
        })

        it('should return a Web3Provider wrapping the network provider', async () => {
            const env = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const provider = await createProviderFactory(hre)(EndpointId.ETHEREUM_MAINNET)

            expect(provider).toBeInstanceOf(Web3Provider)
            expect(provider.provider).toEqual(env.network.provider)

            // Ethers has this ugly habit of importing files here and there,
            // firing RPC requests and all.
            //
            // If we don't wait for the provider to be ready, jest will complain
            // about requests being made after test teardown
            await provider.ready
        })
    })
})
