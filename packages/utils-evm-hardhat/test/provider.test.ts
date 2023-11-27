import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { expect } from 'chai'
import { getNetworkRuntimeEnvironment } from '../src/runtime'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createProviderFactory } from '../src/provider'
import { Web3Provider } from '@ethersproject/providers'

chai.use(chaiAsPromised)

describe('provider', () => {
    describe('createProviderFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createProviderFactory(hre)(EndpointId.CATHAY_TESTNET)).to.eventually.be.rejected
        })

        it('should return a Web3Provider wrapping the network provider', async () => {
            const env = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const provider = await createProviderFactory(hre)(EndpointId.ETHEREUM_MAINNET)

            expect(provider).to.be.instanceOf(Web3Provider)
            expect(provider.provider).to.equal(env.network.provider)
        })
    })
})
