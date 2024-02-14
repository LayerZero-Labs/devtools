import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createSignerFactory } from '@/transactions/signer'
import { JsonRpcProvider, JsonRpcSigner } from 'ethers'
import { OmniSignerEVM } from '@layerzerolabs/devtools-evm'

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
})
