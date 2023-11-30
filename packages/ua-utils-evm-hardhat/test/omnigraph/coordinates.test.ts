import fc from 'fast-check'
import hre from 'hardhat'
import { Deployment, DeploymentSubmission } from 'hardhat-deploy/dist/types'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-utils'
import { OmniDeployment, createContractFactory, omniDeploymentToContract, omniDeploymentToPoint } from '@/omnigraph'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createNetworkEnvironmentFactory } from '@layerzerolabs/utils-evm-hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Contract } from '@ethersproject/contracts'
import { makeZero } from '@layerzerolabs/utils-evm'

describe('omnigraph/coordinates', () => {
    describe('omniDeploymentToPoint', () => {
        it('should just work', () => {
            fc.assert(
                fc.property(endpointArbitrary, evmAddressArbitrary, (eid, address) => {
                    const omniDeployment: OmniDeployment = { eid, deployment: { address } as Deployment }

                    expect(omniDeploymentToPoint(omniDeployment)).toEqual({ eid, address })
                })
            )
        })
    })

    describe('omniDeploymentToContract', () => {
        it('should just work', () => {
            fc.assert(
                fc.property(endpointArbitrary, evmAddressArbitrary, (eid, address) => {
                    const omniDeployment: OmniDeployment = { eid, deployment: { address, abi: [] } as Deployment }
                    const omniContract = omniDeploymentToContract(omniDeployment)

                    // chai is not great with deep equality on class instances so we need to compare the result property by property
                    expect(omniContract.eid).toBe(eid)
                    expect(omniContract.contract.address).toBe(address)
                    expect(omniContract.contract.interface.fragments).toEqual([])
                })
            )
        })
    })

    describe('createContractFactory', () => {
        // Hardhat deploy will try to get the chain ID from the RPC so we can't let it
        const mockSend = (env: HardhatRuntimeEnvironment) => {
            env.network.provider.send = jest.fn().mockResolvedValue(1)
        }

        describe('when called with OmniPointContractName', () => {
            it('should reject when eid does not exist', async () => {
                const deploymentFactory = createContractFactory(hre)

                await expect(() =>
                    deploymentFactory({ eid: EndpointId.CANTO_TESTNET, contractName: 'MyContract' })
                ).rejects.toBeTruthy()
            })

            it('should reject when contract has not been deployed', async () => {
                const environmentFactory = createNetworkEnvironmentFactory(hre)
                const deploymentFactory = createContractFactory(hre)

                const env = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
                mockSend(env)

                await expect(() =>
                    deploymentFactory({ eid: EndpointId.ETHEREUM_MAINNET, contractName: 'MyContract' })
                ).rejects.toBeTruthy()
            })

            it('should resolve when contract has been deployed', async () => {
                const environmentFactory = createNetworkEnvironmentFactory(hre)
                const deploymentFactory = createContractFactory(hre)

                const env = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
                mockSend(env)

                // We'll create a dummy deployment first
                await env.deployments.save('MyContract', {
                    address: makeZero(undefined),
                    abi: [],
                } as DeploymentSubmission)

                // Then check whether the factory will get it for us
                const deployment = await deploymentFactory({
                    eid: EndpointId.ETHEREUM_MAINNET,
                    contractName: 'MyContract',
                })

                expect(deployment).toEqual({
                    eid: EndpointId.ETHEREUM_MAINNET,
                    contract: expect.any(Contract),
                })
            })
        })

        describe('when called with OmniPoint', () => {
            it('should reject when eid does not exist', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const deploymentFactory = createContractFactory(hre)

                        await expect(() =>
                            deploymentFactory({ eid: EndpointId.CANTO_TESTNET, address })
                        ).rejects.toBeTruthy()
                    })
                )
            })

            it('should reject when contract has not been deployed', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const deploymentFactory = createContractFactory(hre)

                        await expect(() =>
                            deploymentFactory({ eid: EndpointId.ETHEREUM_MAINNET, address })
                        ).rejects.toBeTruthy()
                    })
                )
            })

            it('should resolve when contract has been deployed', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const environmentFactory = createNetworkEnvironmentFactory(hre)
                        const deploymentFactory = createContractFactory(hre)

                        const env = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
                        mockSend(env)

                        // We'll create a dummy deployment with the specified address first
                        await env.deployments.save('MyContract', { address, abi: [] } as DeploymentSubmission)

                        // Then check whether the factory will get it for us
                        const deployment = await deploymentFactory({
                            eid: EndpointId.ETHEREUM_MAINNET,
                            address,
                        })

                        expect(deployment).toEqual({
                            eid: EndpointId.ETHEREUM_MAINNET,
                            contract: expect.any(Contract),
                        })
                    })
                )
            })
        })
    })
})
