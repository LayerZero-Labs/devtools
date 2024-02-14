import 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createSignerFactory } from '@/transactions/signer'
import { JsonRpcProvider, ZeroAddress } from 'ethers'
import { OmniSignerEVM } from '@layerzerolabs/devtools-evm'
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

// The signer will ask for eth_accounts so we want to return some addresses for that
jest.spyOn(HardhatEthersProvider.prototype, 'send').mockResolvedValue([ZeroAddress])

describe('signer', () => {
    describe('createSignerFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createSignerFactory()(EndpointId.CATHAY_TESTNET)).rejects.toBeTruthy()
        })

        it('should return an OmniSignerEVM', async () => {
            const signer = await createSignerFactory()(EndpointId.ETHEREUM_V2_MAINNET)

            expect(signer).toBeInstanceOf(OmniSignerEVM)
            expect(signer.signer).toBeInstanceOf(HardhatEthersSigner)
            expect(signer.signer.provider).toBeInstanceOf(HardhatEthersProvider)

            // Ethers has this ugly habit of importing files here and there,
            // firing RPC requests and all.
            //
            // If we don't wait for the provider to be ready, jest will complain
            // about requests being made after test teardown
            await (signer.signer.provider as JsonRpcProvider)?.ready
        })
    })
})
