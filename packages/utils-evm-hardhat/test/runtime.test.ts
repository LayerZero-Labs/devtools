import hre from 'hardhat'
import { DeploymentsManager } from 'hardhat-deploy/dist/src/DeploymentsManager'
import { createNetworkEnvironmentFactory, getNetworkRuntimeEnvironment } from '@/runtime'
import type { DeploymentSubmission } from 'hardhat-deploy/dist/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'

jest.spyOn(DeploymentsManager.prototype, 'getChainId').mockResolvedValue('1')

describe('runtime', () => {
    describe('getNetworkRuntimeEnvironment', () => {
        it('should reject with an invalid network', async () => {
            await expect(getNetworkRuntimeEnvironment('not-in-hardhat-config')).rejects.toBeTruthy()
        })

        it('should return a HardhatRuntimeEnvironment with correct network', async () => {
            const runtime = await getNetworkRuntimeEnvironment('ethereum-mainnet')

            expect(runtime.network.name).toEqual('ethereum-mainnet')
            expect(runtime.deployments).toMatchObject({
                get: expect.any(Function),
            })
        })

        it('should have the config setup correctly', async () => {
            const ethRuntime = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const bscRuntime = await getNetworkRuntimeEnvironment('bsc-testnet')

            expect(ethRuntime.network.name).toBe('ethereum-mainnet')
            expect(ethRuntime.network.config).toBe(hre.config.networks['ethereum-mainnet'])
            expect(bscRuntime.network.name).toBe('bsc-testnet')
            expect(bscRuntime.network.config).toEqual(hre.config.networks['bsc-testnet'])
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
            expect(deployment.args).toEqual(deploymentSubmission.args)

            // And finally we check whether it was not by accident saved for ethereum-mainnet
            const nonExistentDeployment = await ethRuntime.deployments.getOrNull('Mock')
            expect(nonExistentDeployment?.args).not.toEqual(deploymentSubmission.args)
        })
    })

    describe('createNetworkEnvironmentFactory', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createNetworkEnvironmentFactory(hre)(EndpointId.CATHAY_TESTNET)).rejects.toBeTruthy()
        })

        it('should return a HardhatRuntimeEnvironment with correct network', async () => {
            const runtime = await createNetworkEnvironmentFactory(hre)(EndpointId.ETHEREUM_MAINNET)

            expect(runtime.network.name).toEqual('ethereum-mainnet')
            expect(runtime.deployments).toMatchObject({
                get: expect.any(Function),
            })
        })
    })
})
