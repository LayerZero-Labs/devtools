/// <reference types="jest-extended" />

import hre from 'hardhat'
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names'
import { DeploymentsManager } from 'hardhat-deploy/dist/src/DeploymentsManager'
import { TASK_LZ_DEPLOY } from '@layerzerolabs/devtools-evm-hardhat'
import {
    isDirectory,
    isFile,
    promptForText,
    promptToContinue,
    promptToSelectMultiple,
} from '@layerzerolabs/io-devtools'
import { spawnSync } from 'child_process'
import { join } from 'path'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptForText: jest.fn(),
        promptToContinue: jest.fn(),
        promptToSelectMultiple: jest.fn(),
    }
})

const promptForTextMock = promptForText as jest.Mock
const promptToContinueMock = promptToContinue as jest.Mock
const promptToSelectMultipleMock = promptToSelectMultiple as jest.Mock
const runSpy = jest.spyOn(hre, 'run')
const runDeploySpy = jest.spyOn(DeploymentsManager.prototype, 'runDeploy')

describe(`task ${TASK_LZ_DEPLOY}`, () => {
    describe('expectations', () => {
        const EXPECTATIONS_DIRECTORY = join('test', 'task', 'deploy.test.expectations')
        const expectationPath = (name: string) => join(EXPECTATIONS_DIRECTORY, `${name}.exp`)
        const runExpect = (name: string) =>
            spawnSync(expectationPath(name), {
                encoding: 'utf8',
                stdio: 'inherit',
            })

        const deploymentsPath = (networkName: string) => join('deployments', networkName)

        const deploymentPath = (networkName: string) => (name: string) =>
            join(deploymentsPath(networkName), `${name}.json`)

        it('should deploy all tags on all networks', async () => {
            const result = runExpect('deploy-all')

            expect(result.status).toBe(0)

            const britneyDeploymentPath = deploymentPath('britney')
            const tangoDeploymentPath = deploymentPath('tango')
            const vengaboysDeploymentPath = deploymentPath('vengaboys')

            expect(isFile(britneyDeploymentPath('TestProxy'))).toBeTruthy()
            expect(isFile(tangoDeploymentPath('TestProxy'))).toBeTruthy()
            expect(isFile(vengaboysDeploymentPath('TestProxy'))).toBeTruthy()

            expect(isFile(britneyDeploymentPath('Thrower'))).toBeTruthy()
            expect(isFile(tangoDeploymentPath('Thrower'))).toBeTruthy()
            expect(isFile(vengaboysDeploymentPath('Thrower'))).toBeTruthy()
        })

        it('should deploy all tags on vengaboys', async () => {
            const result = runExpect('deploy-vengaboys')

            expect(result.status).toBe(0)

            const vengaboysDeploymentPath = deploymentPath('vengaboys')

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()

            expect(isFile(vengaboysDeploymentPath('TestProxy'))).toBeTruthy()
            expect(isFile(vengaboysDeploymentPath('Thrower'))).toBeTruthy()
        })

        it('should deploy single tag on vengaboys', async () => {
            const result = runExpect('deploy-vengaboys-thrower')

            expect(result.status).toBe(0)

            const vengaboysDeploymentPath = deploymentPath('vengaboys')

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()

            expect(isFile(vengaboysDeploymentPath('Thrower'))).toBeTruthy()
            expect(isFile(vengaboysDeploymentPath('TestProxy'))).toBeFalsy()
        })

        it('should not deploy anything if tag does not exist', async () => {
            const result = runExpect('deploy-all-missing-tag')

            expect(result.status).toBe(0)

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('vengaboys'))).toBeFalsy()
        })

        it('should preselect no networks if there is not network with given stage', async () => {
            const result = runExpect('deploy-all-missing-stage-interactive')

            expect(result.status).toBe(0)

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('vengaboys'))).toBeFalsy()
        })

        it('should not deploy anything if there is not network with given stage', async () => {
            const result = runExpect('deploy-all-missing-stage-ci')

            expect(result.status).toBe(0)

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('vengaboys'))).toBeFalsy()
        })

        it('should fail if both --stage and --networks were provided', async () => {
            const result = runExpect('deploy-vengaboys-sandbox')

            expect(result.status).toBe(0)

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('vengaboys'))).toBeFalsy()
        })

        it('should fail if an invalid --stage has been provided', async () => {
            const result = runExpect('deploy-all-wrong-stage')

            expect(result.status).toBe(0)

            expect(isDirectory(deploymentsPath('britney'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('tango'))).toBeFalsy()
            expect(isDirectory(deploymentsPath('vengaboys'))).toBeFalsy()
        })
    })

    const expectDeployment = expect.objectContaining({
        abi: expect.any(Array),
        args: expect.any(Array),
        address: expect.any(String),
        bytecode: expect.any(String),
        metadata: expect.any(String),
    })

    beforeEach(() => {
        promptForTextMock.mockRejectedValue('Not mocked: promptForText')
        promptToContinueMock.mockRejectedValue('Not mocked: promptToContinue')
        promptToSelectMultipleMock.mockRejectedValue('Not mocked: promptToSelectMultiple')
    })

    afterEach(async () => {
        promptForTextMock.mockReset()
        promptToContinueMock.mockReset()
        promptToSelectMultipleMock.mockReset()

        runDeploySpy.mockClear()
    })

    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_DEPLOY]).not.toBeUndefined()
    })

    describe('in interactive mode', () => {
        it('should compile contracts', async () => {
            // We want to say no to deployment, just test that the compilation has run
            promptToContinueMock.mockResolvedValueOnce(false)
            // We want to deploy all files
            promptForTextMock.mockResolvedValueOnce('')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce([])

            await hre.run(TASK_LZ_DEPLOY, {})

            // For some reason even though we did not specify any arguments to the compile task,
            // jest still sees some aarguments being passed so we need to pass those to make this expect work
            expect(runSpy).toHaveBeenCalledWith(TASK_COMPILE, undefined, {}, undefined)
        })

        it('should ask for networks & tags', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValueOnce(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('tag1,tag2')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce(['vengaboys', 'tango'])

            // Since we provided two made up tags, nothing should get deployed
            await expect(hre.run(TASK_LZ_DEPLOY, {})).resolves.toEqual({
                tango: {
                    contracts: {},
                },
                vengaboys: {
                    contracts: {},
                },
            })

            expect(promptToSelectMultipleMock).toHaveBeenCalledTimes(1)
            expect(promptToSelectMultipleMock).toHaveBeenCalledWith(
                'Which networks would you like to deploy?',
                expect.objectContaining({
                    options: [
                        {
                            disabled: false,
                            hint: 'Connected to AVALANCHE_V2_MAINNET',
                            selected: true,
                            title: 'britney',
                            value: 'britney',
                        },
                        {
                            disabled: false,
                            hint: 'Connected to BSC_V2_MAINNET',
                            selected: true,
                            title: 'tango',
                            value: 'tango',
                        },
                        {
                            disabled: false,
                            hint: 'Connected to ETHEREUM_V2_MAINNET',
                            selected: true,
                            title: 'vengaboys',
                            value: 'vengaboys',
                        },
                        { disabled: true, hint: undefined, selected: false, title: 'hardhat', value: 'hardhat' },
                        { disabled: true, hint: undefined, selected: false, title: 'localhost', value: 'localhost' },
                    ],
                })
            )

            expect(promptForTextMock).toHaveBeenCalledTimes(1)
            expect(promptForTextMock).toHaveBeenCalledWith('Which deploy script tags would you like to use?', {
                defaultValue: '',
                hint: 'Leave empty to use all deploy scripts',
            })

            expect(promptToContinueMock).toHaveBeenCalledTimes(1)
        })

        it('should not deploy anything if no networks have been selected', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValueOnce(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('tag1,tag2')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce([])

            // Since we provided selected no networks, we should get an empty object back
            await expect(hre.run(TASK_LZ_DEPLOY, {})).resolves.toEqual({})
        })

        it('should not deploy anything if the user says no', async () => {
            // We want to say no to deployment
            promptToContinueMock.mockResolvedValueOnce(false)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('tag1,tag2')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce(['vengaboys', 'tango'])

            // Since the user said no to the development, we should get an empty object back
            await expect(hre.run(TASK_LZ_DEPLOY, {})).resolves.toEqual({})
        })

        it('should deploy everything if the user provides no tags', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValueOnce(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce(['vengaboys', 'tango'])

            // Since we provided selected no tags, everything will be deployed
            await expect(hre.run(TASK_LZ_DEPLOY, { reset: true })).resolves.toEqual({
                tango: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
                vengaboys: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
            })
        })

        it('should not redeploy if reset flag has not been passed', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValue(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValue('')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValue(['vengaboys', 'tango'])

            // We run the deploy first
            await hre.run(TASK_LZ_DEPLOY, {})

            // Then we run the deploy again and expect nothing to have been deployed
            // since we didn't pass the --reset flag
            await expect(hre.run(TASK_LZ_DEPLOY, {})).resolves.toEqual({
                tango: {
                    contracts: {},
                },
                vengaboys: {
                    contracts: {},
                },
            })
        })

        it('should redeploy if reset flag has been passed', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValue(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValue('')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValue(['vengaboys', 'tango'])

            // We run the deploy first
            await hre.run(TASK_LZ_DEPLOY, {})

            // Then we run the deploy again
            await expect(hre.run(TASK_LZ_DEPLOY, { reset: true })).resolves.toEqual({
                tango: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
                vengaboys: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
            })
        })

        it('should only deploy the provided tags', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValueOnce(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('Thrower')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce(['vengaboys', 'tango'])

            await hre.run(TASK_LZ_DEPLOY, {})

            expect(runDeploySpy).toHaveBeenCalledTimes(2)
            expect(runDeploySpy).toHaveBeenNthCalledWith(1, ['Thrower'], expect.any(Object))
            expect(runDeploySpy).toHaveBeenNthCalledWith(2, ['Thrower'], expect.any(Object))
        })

        it('should not reset memory on the deployments extension', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValueOnce(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce(['vengaboys', 'tango'])

            await hre.run(TASK_LZ_DEPLOY, {})

            expect(runDeploySpy).toHaveBeenCalledTimes(2)
            expect(runDeploySpy).toHaveBeenNthCalledWith(
                1,
                [],
                expect.objectContaining({
                    resetMemory: false,
                })
            )
            expect(runDeploySpy).toHaveBeenNthCalledWith(
                2,
                [],
                expect.objectContaining({
                    resetMemory: false,
                })
            )
        })
    })

    describe('in CI mode', () => {
        it('should compile contracts', async () => {
            // We want to just check the compilation and not deploy anything
            // se we set the networks to an empty array
            await hre.run(TASK_LZ_DEPLOY, { ci: true, networks: [] })

            // For some reason even though we did not specify any arguments to the compile task,
            // jest still sees some aarguments being passed so we need to pass those to make this expect work
            expect(runSpy).toHaveBeenCalledWith(TASK_COMPILE, undefined, {}, undefined)
        })

        it('should use all available networks & tags if networks argument is undefined', async () => {
            await expect(
                hre.run(TASK_LZ_DEPLOY, {
                    ci: true,
                    reset: true,
                })
            ).resolves.toEqual({
                britney: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
                tango: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
                vengaboys: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
            })

            expect(promptToSelectMultipleMock).not.toHaveBeenCalled()
            expect(promptForTextMock).not.toHaveBeenCalled()
            expect(promptToContinueMock).not.toHaveBeenCalled()
        })

        it('should not deploy anything if an empty array of networks was provided', async () => {
            // Since we provided an empty array of networks, we should get an empty object back
            await expect(
                hre.run(TASK_LZ_DEPLOY, {
                    ci: true,
                    networks: [],
                })
            ).resolves.toEqual({})
        })

        it('should deploy everything if an empty array of tags was provided', async () => {
            // Since we provided an empty array of tags, we should use all the deployment scripts
            await expect(
                hre.run(TASK_LZ_DEPLOY, {
                    ci: true,
                    tags: [],
                    reset: true,
                })
            ).resolves.toEqual({
                britney: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
                tango: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
                vengaboys: {
                    contracts: expect.objectContaining({
                        Thrower: expectDeployment,
                        TestProxy: expectDeployment,
                    }),
                },
            })
        })

        it('should deploy only the tags provided', async () => {
            await hre.run(TASK_LZ_DEPLOY, { ci: true, tags: ['Thrower'] })

            expect(runDeploySpy).toHaveBeenCalledTimes(3)
            expect(runDeploySpy).toHaveBeenNthCalledWith(1, ['Thrower'], expect.any(Object))
            expect(runDeploySpy).toHaveBeenNthCalledWith(2, ['Thrower'], expect.any(Object))
            expect(runDeploySpy).toHaveBeenNthCalledWith(3, ['Thrower'], expect.any(Object))
        })
    })
})
