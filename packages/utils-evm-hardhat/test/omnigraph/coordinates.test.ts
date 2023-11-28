import fc from 'fast-check'
import { expect } from 'chai'
import { describe } from 'mocha'
import hre from 'hardhat'
import { Deployment, DeploymentSubmission } from 'hardhat-deploy/dist/types'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-utils'
import { OmniDeployment, collectDeployments, omniDeploymentToPoint } from '../../src/omnigraph'
import { getNetworkRuntimeEnvironment } from '../../src/runtime'

describe('omnigraph/coordinates', () => {
    describe('collectDeployments', () => {
        beforeEach(async () => {
            const bscTestnetRuntime = await getNetworkRuntimeEnvironment('bsc-testnet')
            const ethMainnetRuntime = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const ethTestnetRuntime = await getNetworkRuntimeEnvironment('ethereum-testnet')

            await bscTestnetRuntime.deployments.delete('MyWeirdContract')
            await ethMainnetRuntime.deployments.delete('MyWeirdContract')
            await ethTestnetRuntime.deployments.delete('MyWeirdContract')
        })

        it('should return an empty array if there are no deployments', async () => {
            const deployments = await collectDeployments(hre, 'NonExistentContract')

            expect(deployments).to.eql([])
        })

        it('should skip a network if endpointId is missing', async () => {
            // First we make sure that the network we want to deploy to has no endpointId
            const bscRuntime = await getNetworkRuntimeEnvironment('bsc-testnet')
            expect(bscRuntime.network.config.endpointId).to.be.undefined

            // Now we create a mock deployment
            const now = Date.now()
            const deploymentSubmission = {
                args: [now],
            } as DeploymentSubmission

            // Save it
            await bscRuntime.deployments.save('MyWeirdContract', deploymentSubmission)

            // And check that it will not be picked up
            const deployments = await collectDeployments(hre, 'MyWeirdContract')

            expect(deployments).to.eql([])
        })

        it('should skip a network if deployment is missing', async () => {
            // First we make sure that the network we want to deploy to has an endpointId
            const ethRuntime = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            expect(ethRuntime.network.config.endpointId).not.to.be.undefined

            // Now we create a mock deployment
            const now = Date.now()
            const deploymentSubmission = {
                args: [now],
            } as DeploymentSubmission

            // Save it
            await ethRuntime.deployments.save('MyWeirdContract', deploymentSubmission)

            // And check that it will not be picked up
            const deployments = await collectDeployments(hre, 'MyWeirdContract')

            // Now check that bsc-testnet and ethereum-testnet did not get included
            expect(deployments).to.eql([
                {
                    eid: ethRuntime.network.config.endpointId,
                    deployment: {
                        ...deploymentSubmission,
                        numDeployments: 1,
                    },
                },
            ])
        })

        it('should include all deployments that have endpointId configured', async () => {
            // First we make sure that the networks we want to deploy to have endpointId
            const ethMainnetRuntime = await getNetworkRuntimeEnvironment('ethereum-mainnet')
            const ethTestnetRuntime = await getNetworkRuntimeEnvironment('ethereum-testnet')
            expect(ethMainnetRuntime.network.config.endpointId).not.to.be.undefined
            expect(ethTestnetRuntime.network.config.endpointId).not.to.be.undefined

            // Now we create mock deployments
            const now = Date.now()
            const deploymentSubmissionMainnet = {
                args: ['mainnet', now],
            } as DeploymentSubmission

            const deploymentSubmissionTestnet = {
                args: ['testnet', now],
            } as DeploymentSubmission

            // Save it
            await ethMainnetRuntime.deployments.save('MyWeirdContract', deploymentSubmissionMainnet)
            await ethTestnetRuntime.deployments.save('MyWeirdContract', deploymentSubmissionTestnet)

            // And check that it will not be picked up
            const deployments = await collectDeployments(hre, 'MyWeirdContract')

            // Now check that bsc-testnet and ethereum-testnet did not get included
            expect(deployments).to.eql([
                {
                    eid: ethMainnetRuntime.network.config.endpointId,
                    deployment: {
                        ...deploymentSubmissionMainnet,
                        numDeployments: 1,
                    },
                },
                {
                    eid: ethTestnetRuntime.network.config.endpointId,
                    deployment: {
                        ...deploymentSubmissionTestnet,
                        numDeployments: 1,
                    },
                },
            ])
        })
    })

    describe('omniDeploymentToPoint', () => {
        fc.assert(
            fc.property(endpointArbitrary, evmAddressArbitrary, (eid, address) => {
                const omniDeployment: OmniDeployment = { eid, deployment: { address } as Deployment }

                expect(omniDeploymentToPoint(omniDeployment)).to.eql({ eid, address })
            })
        )
    })
})
