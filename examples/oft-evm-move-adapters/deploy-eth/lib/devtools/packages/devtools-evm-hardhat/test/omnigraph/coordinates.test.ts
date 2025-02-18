import fc from 'fast-check'
import hre from 'hardhat'
import { DeploymentsManager } from 'hardhat-deploy/dist/src/DeploymentsManager'
import { Deployment } from 'hardhat-deploy/dist/types'
import { endpointArbitrary, evmAddressArbitrary } from '@layerzerolabs/test-devtools'
import { OmniDeployment, createContractFactory, omniDeploymentToContract, omniDeploymentToPoint } from '@/omnigraph'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Contract } from '@ethersproject/contracts'
import { makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { createGetHreByEid } from '@/runtime'
import { Artifact } from 'hardhat/types'

describe('omnigraph/coordinates', () => {
    beforeEach(() => {
        jest.spyOn(DeploymentsManager.prototype, 'getChainId').mockResolvedValue('1')
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

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
                const contractFactory = createContractFactory()

                await expect(() =>
                    contractFactory({ eid: EndpointId.CANTO_TESTNET, contractName: 'MyContract' })
                ).rejects.toBeTruthy()
            })

            it('should reject when contract has not been deployed', async () => {
                const contractFactory = createContractFactory()

                await expect(() =>
                    contractFactory({ eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'MyContract' })
                ).rejects.toBeTruthy()
            })

            it('should resolve with bound artifact if found', async () => {
                const environmentFactory = createGetHreByEid(hre)
                const contractFactory = createContractFactory(environmentFactory)

                const env = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
                const artifact: Artifact = {
                    abi: [],
                } as unknown as Artifact
                jest.spyOn(env.deployments, 'getArtifact').mockResolvedValue(artifact)

                // Then check whether the factory will get it for us
                const deployment = await contractFactory({
                    eid: EndpointId.ETHEREUM_V2_MAINNET,
                    address: makeZeroAddress(),
                    contractName: 'MyContract',
                })

                expect(deployment).toEqual({
                    eid: EndpointId.ETHEREUM_V2_MAINNET,
                    contract: expect.any(Contract),
                })
                expect(env.deployments.getArtifact).toHaveBeenCalledWith('MyContract')
            })

            it('should fall back on getting the artifact based on the deployments if artifact not found', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const environmentFactory = createGetHreByEid(hre)
                        const contractFactory = createContractFactory(environmentFactory)

                        const env = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
                        jest.spyOn(env.deployments, 'getArtifact').mockRejectedValue(new Error(`oh no`))
                        jest.spyOn(env.deployments, 'getDeploymentsFromAddress').mockResolvedValue([
                            {
                                address,
                                abi: [],
                            },
                        ])

                        // Then check whether the factory will get it for us
                        const deployment = await contractFactory({
                            eid: EndpointId.ETHEREUM_V2_MAINNET,
                            address,
                            contractName: 'MyContract',
                        })

                        expect(deployment).toEqual({
                            eid: EndpointId.ETHEREUM_V2_MAINNET,
                            contract: expect.any(Contract),
                        })
                        expect(env.deployments.getArtifact).toHaveBeenCalledWith('MyContract')
                        expect(env.deployments.getDeploymentsFromAddress).toHaveBeenCalledWith(address)
                    })
                )
            })

            it('should resolve when contract has been deployed', async () => {
                const environmentFactory = createGetHreByEid(hre)
                const contractFactory = createContractFactory(environmentFactory)

                const env = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
                jest.spyOn(env.deployments, 'getOrNull').mockResolvedValue({
                    address: makeZeroAddress(undefined),
                    abi: [],
                })

                // Then check whether the factory will get it for us
                const deployment = await contractFactory({
                    eid: EndpointId.ETHEREUM_V2_MAINNET,
                    contractName: 'MyContract',
                })

                expect(deployment).toEqual({
                    eid: EndpointId.ETHEREUM_V2_MAINNET,
                    contract: expect.any(Contract),
                })
                expect(env.deployments.getOrNull).toHaveBeenCalledWith('MyContract')
            })
        })

        describe('when called with OmniPoint', () => {
            it('should reject when eid does not exist', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const contractFactory = createContractFactory()

                        await expect(() =>
                            contractFactory({ eid: EndpointId.CANTO_TESTNET, address })
                        ).rejects.toBeTruthy()
                    })
                )
            })

            it('should reject when contract has not been deployed', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const contractFactory = createContractFactory()

                        await expect(() =>
                            contractFactory({ eid: EndpointId.ETHEREUM_V2_MAINNET, address })
                        ).rejects.toThrow(/Could not find a deployment for address/)
                    })
                )
            })

            it('should resolve when there is only one deployment for the contract', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const environmentFactory = createGetHreByEid(hre)
                        const contractFactory = createContractFactory(environmentFactory)

                        const env = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
                        jest.spyOn(env.deployments, 'getDeploymentsFromAddress').mockResolvedValue([
                            {
                                address,
                                abi: [],
                            },
                        ])

                        // Then check whether the factory will get it for us
                        const deployment = await contractFactory({
                            eid: EndpointId.ETHEREUM_V2_MAINNET,
                            address,
                        })

                        expect(deployment).toEqual({
                            eid: EndpointId.ETHEREUM_V2_MAINNET,
                            contract: expect.any(Contract),
                        })
                        expect(env.deployments.getDeploymentsFromAddress).toHaveBeenCalledWith(address)
                    })
                )
            })

            it('should merge ABIs when there are multiple deployments with the same address (proxy deployments)', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, async (address) => {
                        const environmentFactory = createGetHreByEid(hre)
                        const contractFactory = createContractFactory(environmentFactory)

                        const env = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
                        jest.spyOn(env.deployments, 'getDeploymentsFromAddress').mockResolvedValue([
                            {
                                address,
                                abi: [
                                    { name: 'implementation', outputs: [], stateMutability: 'view', type: 'function' },
                                ],
                            },
                            {
                                address,
                                abi: [
                                    { name: 'contractMethod', outputs: [], stateMutability: 'view', type: 'function' },
                                ],
                            },
                        ])

                        // Then check whether the factory will get it for us
                        const omniContract = await contractFactory({
                            eid: EndpointId.ETHEREUM_V2_MAINNET,
                            address,
                        })

                        expect(omniContract).toEqual({
                            eid: EndpointId.ETHEREUM_V2_MAINNET,
                            contract: expect.any(Contract),
                        })
                        expect(omniContract.contract.implementation).toBeInstanceOf(Function)
                        expect(omniContract.contract.contractMethod).toBeInstanceOf(Function)
                    })
                )
            })
        })
    })
})
