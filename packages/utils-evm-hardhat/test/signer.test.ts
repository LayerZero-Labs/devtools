import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createSignerFactory } from '@/signer/factory'
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'
import { OmniSignerEVM } from '@layerzerolabs/utils-evm'

// Ethers calls the eth_chainId RPC method when initializing a provider so we mock the result
jest.spyOn(Web3Provider.prototype, 'send').mockResolvedValue('1')

describe('signer', () => {
    describe('createSignerFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createSignerFactory()(EndpointId.CATHAY_TESTNET)).rejects.toBeTruthy()
        })

        it('should return an OmniSignerEVM', async () => {
            const signer = await createSignerFactory()(EndpointId.ETHEREUM_MAINNET)

            expect(signer).toBeInstanceOf(OmniSignerEVM)
            expect(signer.signer).toBeInstanceOf(JsonRpcSigner)
            expect(signer.signer.provider).toBeInstanceOf(Web3Provider)

            // Ethers has this ugly habit of importing files here and there,
            // firing RPC requests and all.
            //
            // If we don't wait for the provider to be ready, jest will complain
            // about requests being made after test teardown
            await (signer.signer.provider as Web3Provider)?.ready
        })
    })
})
