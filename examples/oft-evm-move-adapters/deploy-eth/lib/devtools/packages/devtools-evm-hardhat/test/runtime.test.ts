import hre from 'hardhat'
import { DeploymentsManager } from 'hardhat-deploy/dist/src/DeploymentsManager'
import {
    createGetHreByEid,
    getEidForNetworkName,
    getNetworkNameForEid,
    getHreByNetworkName,
    getEidsByNetworkName,
    inheritTask,
} from '@/runtime'
import type { DeploymentSubmission } from 'hardhat-deploy/dist/types'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { subtask, task } from 'hardhat/config'
import { types } from '@/cli'

jest.spyOn(DeploymentsManager.prototype, 'getChainId').mockResolvedValue('1')

describe('runtime', () => {
    describe('getHreByNetworkName', () => {
        it('should reject with an invalid network', async () => {
            await expect(getHreByNetworkName('not-in-hardhat-config')).rejects.toBeTruthy()
        })

        it('should return a HardhatRuntimeEnvironment with correct network', async () => {
            const runtime = await getHreByNetworkName('ethereum-mainnet')

            expect(runtime.network.name).toEqual('ethereum-mainnet')
            expect(runtime.deployments).toMatchObject({
                get: expect.any(Function),
            })
        })

        it('should have the config setup correctly', async () => {
            const ethRuntime = await getHreByNetworkName('ethereum-mainnet')
            const bscRuntime = await getHreByNetworkName('bsc-testnet')

            expect(ethRuntime.network.name).toBe('ethereum-mainnet')
            expect(ethRuntime.network.config).toBe(hre.config.networks['ethereum-mainnet'])
            expect(bscRuntime.network.name).toBe('bsc-testnet')
            expect(bscRuntime.network.config).toEqual(hre.config.networks['bsc-testnet'])
        })

        it('should save the deployment to correct network', async () => {
            const bscRuntime = await getHreByNetworkName('bsc-testnet')
            const ethRuntime = await getHreByNetworkName('ethereum-mainnet')
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

    describe('createGetHreByEid()', () => {
        it('should reject with an endpoint that is not in the hardhat config', async () => {
            await expect(createGetHreByEid(hre)(EndpointId.CATHAY_TESTNET)).rejects.toThrow(
                'Could not find a network for eid 10171 (CATHAY_TESTNET)'
            )
        })

        it('should return a HardhatRuntimeEnvironment with correct network', async () => {
            const runtime = await createGetHreByEid(hre)(EndpointId.ETHEREUM_V2_MAINNET)

            expect(runtime.network.name).toEqual('ethereum-mainnet')
            expect(runtime.deployments).toMatchObject({
                get: expect.any(Function),
            })
        })
    })

    describe('getEidForNetworkName', () => {
        it('should throw if there is no such network defined', () => {
            expect(() => getEidForNetworkName('nonsense')).toThrow(
                `Network 'nonsense' is not defined in hardhat config`
            )
        })

        it('should throw if the network does not have eid defined', () => {
            expect(() => getEidForNetworkName('bsc-testnet')).toThrow(
                `Network 'bsc-testnet' does not have 'eid' property defined in its config`
            )
        })

        it('should return eid if defined', () => {
            expect(getEidForNetworkName('ethereum-testnet')).toBe(EndpointId.ETHEREUM_TESTNET)
            expect(getEidForNetworkName('ethereum-mainnet')).toBe(EndpointId.ETHEREUM_V2_MAINNET)
        })
    })

    describe('getNetworkNameForEid', () => {
        it('should throw if there is no such eid defined', () => {
            expect(() => getNetworkNameForEid(EndpointId.CATHAY_TESTNET)).toThrow(
                'Could not find a network for eid 10171 (CATHAY_TESTNET)'
            )
        })

        it('should throw if there are more networks defined with the same eid', () => {
            const hre = {
                config: {
                    networks: {
                        one: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                        two: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                        three: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                    },
                },
            }

            expect(() =>
                getNetworkNameForEid(EndpointId.APTOS_MAINNET, hre as unknown as HardhatRuntimeEnvironment)
            ).toThrowErrorMatchingSnapshot()
        })
    })

    describe('getEidsByNetworkName', () => {
        it('should return undefined for networks that do not have eid defined', async () => {
            const hre = {
                config: {
                    networks: {
                        one: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                        two: {
                            eid: EndpointId.BASE_TESTNET,
                        },
                        three: {},
                        four: {},
                    },
                },
            }

            expect(getEidsByNetworkName(hre as unknown as HardhatRuntimeEnvironment)).toEqual({
                one: EndpointId.APTOS_MAINNET,
                two: EndpointId.BASE_TESTNET,
                three: undefined,
                four: undefined,
            })
        })

        it('should throw if there are more networks defined with the same eid', () => {
            const hre = {
                config: {
                    networks: {
                        one: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                        two: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                        three: {
                            eid: EndpointId.APTOS_MAINNET,
                        },
                        four: {
                            eid: EndpointId.BASE_TESTNET,
                        },
                        five: {
                            eid: EndpointId.BASE_TESTNET,
                        },
                    },
                },
            }

            expect(() =>
                getEidsByNetworkName(hre as unknown as HardhatRuntimeEnvironment)
            ).toThrowErrorMatchingSnapshot()
        })
    })

    describe('inheritTask()', () => {
        it('should fail if the parent task does not exist', () => {
            expect(() => inheritTask('i-am-not-here')('i-wont-be-here-either')).toThrow(
                `Missing task definition for i-am-not-here`
            )
        })

        it('should not fail if the parent task exists', () => {
            task('i-am-here', async () => {})
                .addFlag('flag', 'Flag')
                .addOptionalParam('optionalParam', 'Optional param', 'seven', types.csv)
                .addOptionalPositionalParam('optionalPositionalParam', 'Optional positional param', 'yes', types.string)
                .addOptionalVariadicPositionalParam(
                    'optionalVariadicPositionalParam',
                    'Optional positional variadic param',
                    undefined,
                    types.boolean
                )

            inheritTask('i-am-here')('i-will-be-here')

            expect(hre.tasks['i-will-be-here']).toEqual({
                ...hre.tasks['i-am-here'],
                _task: 'i-will-be-here',
                isSubtask: false,
            })
        })

        it('should not fail if the parent subtask exists', () => {
            subtask('i-am-here-subtask', async () => {})
                .addFlag('flag', 'Flag')
                .addOptionalParam('optionalParam', 'Optional param', 'seven', types.csv)
                .addOptionalPositionalParam('optionalPositionalParam', 'Optional positional param', 'yes', types.string)
                .addOptionalVariadicPositionalParam(
                    'optionalVariadicPositionalParam',
                    'Optional positional variadic param',
                    undefined,
                    types.boolean
                )

            inheritTask('i-am-here-subtask')('i-will-be-here-subtask')

            expect(hre.tasks['i-will-be-here-subtask']).toEqual({
                ...hre.tasks['i-am-here-subtask'],
                _task: 'i-will-be-here-subtask',
                isSubtask: true,
            })
        })
    })
})
