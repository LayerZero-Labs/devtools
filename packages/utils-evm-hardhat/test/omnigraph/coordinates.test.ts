import fc from 'fast-check'
import hre from 'hardhat'
import { DeploymentsManager } from 'hardhat-deploy/dist/src/DeploymentsManager'
import { Deployment } from 'hardhat-deploy/dist/types'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-utils'
import { OmniDeployment, createContractFactory, omniDeploymentToContract, omniDeploymentToPoint } from '@/omnigraph'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Contract } from '@ethersproject/contracts'
import { makeZero } from '@layerzerolabs/utils-evm'
import { createNetworkEnvironmentFactory } from '@/runtime'

jest.spyOn(DeploymentsManager.prototype, 'getChainId').mockResolvedValue('1')

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
        describe('when called with OmniPointContractName', () => {
            it('should reject when eid does not exist', async () => {
                const contractFactory = createContractFactory(hre)

                await expect(() =>
                    contractFactory({ eid: EndpointId.CANTO_TESTNET, contractName: 'MyContract' })
                ).rejects.toBeTruthy()
            })

            it('should reject when contract has not been deployed', async () => {
                const contractFactory = createContractFactory(hre)

                await expect(() =>
                    contractFactory({ eid: EndpointId.ETHEREUM_MAINNET, contractName: 'MyContract' })
                ).rejects.toBeTruthy()
            })

            it('should resolve when contract has been deployed', async () => {
                const environmentFactory = createNetworkEnvironmentFactory(hre)
                const contractFactory = createContractFactory(hre, environmentFactory)

                const env = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
                jest.spyOn(env.deployments, 'getOrNull').mockResolvedValue({
                    address: makeZero(undefined),
                    abi: [],
                })

                // Then check whether the factory will get it for us
                const deployment = await contractFactory({
                    eid: EndpointId.ETHEREUM_MAINNET,
                    contractName: 'MyContract',
                })

                expect(deployment).toEqual({
                    eid: EndpointId.ETHEREUM_MAINNET,
                    contract: expect.any(Contract),
                })
                expect(env.deployments.getOrNull).toHaveBeenCalledWith('MyContract')
            })
        })

        describe('when called with OmniPoint', () => {
            it('should reject when eid does not exist', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const contractFactory = createContractFactory(hre)

                        await expect(() =>
                            contractFactory({ eid: EndpointId.CANTO_TESTNET, address })
                        ).rejects.toBeTruthy()
                    })
                )
            })

            it('should reject when contract has not been deployed', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const contractFactory = createContractFactory(hre)

                        await expect(() =>
                            contractFactory({ eid: EndpointId.ETHEREUM_MAINNET, address })
                        ).rejects.toThrow(/Could not find a deployment for address/)
                    })
                )
            })

            it('should resolve when contract has been deployed', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const environmentFactory = createNetworkEnvironmentFactory(hre)
                        const contractFactory = createContractFactory(hre, environmentFactory)

                        const env = await environmentFactory(EndpointId.ETHEREUM_MAINNET)
                        jest.spyOn(env.deployments, 'getDeploymentsFromAddress').mockResolvedValue([
                            {
                                address: makeZero(undefined),
                                abi: [],
                            },
                        ])

                        // Then check whether the factory will get it for us
                        const deployment = await contractFactory({
                            eid: EndpointId.ETHEREUM_MAINNET,
                            address,
                        })

                        expect(deployment).toEqual({
                            eid: EndpointId.ETHEREUM_MAINNET,
                            contract: expect.any(Contract),
                        })
                        expect(env.deployments.getOrNull).toHaveBeenCalledWith('MyContract')
                    })
                )
            })
        })
    })
})
