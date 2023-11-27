import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { expect } from 'chai'
import { createNetworkEnvironmentFactory, getNetworkRuntimeEnvironment } from '../src/runtime'
import type { DeploymentSubmission } from 'hardhat-deploy/dist/types'
import hre from 'hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

chai.use(chaiAsPromised)

describe('runtime', () => {
    describe('getNetworkRuntimeEnvironment', () => {
        it('should reject with an invalid network', async () => {
            await expect(getNetworkRuntimeEnvironment('not-in-hardhat-config')).to.eventually.be.rejected
        })

        it('should return a HardhatRuntimeEnvironment with correct network', async () => {
            const runtime = await getNetworkRuntimeEnvironment('ethereum-mainnet')

            expect(runtime.network.name).to.eql('ethereum-mainnet')
            expect(runtime.deployments).to.be.an('object')
        })

        it('should have the config setup correctly', async () => {
            const ethRuntime = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const bscRuntime = await getNetworkRuntimeEnvironment('bsc-testnet')

            expect(ethRuntime.network.config.saveDeployments).to.be.true
            expect(bscRuntime.network.config.saveDeployments).to.be.undefined
        })

        it('should save the deployment to correct network', async () => {
            const bscRuntime = await getNetworkRuntimeEnvironment('bsc-testnet')
            const ethRuntime = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const now = Date.now()
            const deploymentSubmission = {
                args: ['bsc-testnet', now],
            } as DeploymentSubmission

            // First we want to save the deployment for bsc-testnet
            await bscRuntime.deployments.save('Mock', deploymentSubmission)

            // Then we check whether it has been saved
            const deployment = await bscRuntime.deployments.get('Mock')
            expect(deployment.args).to.eql(deploymentSubmission.args)

            // And finally we check whether it was not by accident saved for ethereum-mainnet
            const nonExistentDeployment = await ethRuntime.deployments.getOrNull('Mock')
            expect(nonExistentDeployment?.args).not.to.eql(deploymentSubmission.args)
        })
    })

    describe('createNetworkEnvironmentFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createNetworkEnvironmentFactory(hre)(EndpointId.CATHAY_TESTNET)).to.eventually.be.rejected
        })

        it('should return a HardhatRuntimeEnvironment with correct network', async () => {
            const runtime = await createNetworkEnvironmentFactory(hre)(EndpointId.ETHEREUM_MAINNET)

            expect(runtime.network.name).to.eql('ethereum-mainnet')
            expect(runtime.deployments).to.be.an('object')
        })
    })
})
