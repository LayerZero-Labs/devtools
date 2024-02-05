/// <reference types="jest-extended" />

import hre from 'hardhat'
import {
    TASK_LZ_DEPLOY,
    createClearDeployments,
    createGetHreByEid,
    getEidForNetworkName,
} from '@layerzerolabs/devtools-evm-hardhat'
import { promptForText, promptToContinue, promptToSelectMultiple } from '@layerzerolabs/io-devtools'

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

describe(`task ${TASK_LZ_DEPLOY}`, () => {
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

        const getHreByEid = createGetHreByEid(hre)
        const clearDeployments = createClearDeployments(getHreByEid)

        await clearDeployments(getEidForNetworkName('britney'))
        await clearDeployments(getEidForNetworkName('tango'))
        await clearDeployments(getEidForNetworkName('vengaboys'))
    })

    it('should be available', () => {
        expect(hre.tasks[TASK_LZ_DEPLOY]).not.toBeUndefined()
    })

    describe('in interactive mode', () => {
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

            // Since we provided selected no networks, we should get an empty object back
            await expect(hre.run(TASK_LZ_DEPLOY, {})).resolves.toEqual({})
        })

        it('should deploy everything if the user provides no tags', async () => {
            // We want to say yes to deployment
            promptToContinueMock.mockResolvedValueOnce(true)
            // We want to deploy two imaginary tags
            promptForTextMock.mockResolvedValueOnce('')
            // And we want to select two networks
            promptToSelectMultipleMock.mockResolvedValueOnce(['vengaboys', 'tango'])

            // Since we provided selected no networks, we should get an empty object back
            await expect(hre.run(TASK_LZ_DEPLOY, {})).resolves.toEqual({
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

            const { tango, vengaboys } = await hre.run(TASK_LZ_DEPLOY, {})

            expect(Object.keys(tango.contracts)).toEqual(['Thrower'])
            expect(Object.keys(vengaboys.contracts)).toEqual(['Thrower'])
        })
    })

    describe('in CI mode', () => {
        it('should use all available networks & tags if networks argument is undefined', async () => {
            await expect(
                hre.run(TASK_LZ_DEPLOY, {
                    ci: true,
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
            const { tango, vengaboys, britney } = await hre.run(TASK_LZ_DEPLOY, { ci: true, tags: ['Thrower'] })

            expect(Object.keys(britney.contracts)).toEqual(['Thrower'])
            expect(Object.keys(tango.contracts)).toEqual(['Thrower'])
            expect(Object.keys(vengaboys.contracts)).toEqual(['Thrower'])
        })
    })
})
