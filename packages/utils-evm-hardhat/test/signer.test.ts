import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { expect } from 'chai'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createSignerFactory } from '../src/signer'
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers'

chai.use(chaiAsPromised)

describe('signer', () => {
    describe('createSignerFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createSignerFactory()(EndpointId.CATHAY_TESTNET)).to.eventually.be.rejected
        })

        it('should return a JsonRpcSigner', async () => {
            const signer = await createSignerFactory()(EndpointId.ETHEREUM_MAINNET)

            expect(signer).to.be.instanceOf(JsonRpcSigner)
            expect(signer.provider).to.be.instanceOf(Web3Provider)
        })
    })
})
