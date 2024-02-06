import { TASK_LZ_OAPP_CONFIG_INIT } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { HardhatContext } from 'hardhat/internal/context'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import { formatEid } from '@layerzerolabs/devtools'
import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import { getTestHre } from '@layerzerolabs/test-devtools-evm-hardhat'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked: promptToContinue'),
        promptToSelectMultiple: jest.fn().mockRejectedValue('Not mocked: promptToSelectMultiple'),
    }
})

describe(`task ${TASK_LZ_OAPP_CONFIG_INIT}`, () => {
    /**
     * Helper utility that loads hardhat in isolation,
     * ensuring that a new copy of hardhat will be loaded
     * everytime we call this.
     *
     * This is useful since we are testing a behavior of feature flagged task
     * whose presence is determined by a env variable when hardhat is loaded
     *
     * @param {(hre: HardhatRuntimeEnvironment) => void | Promise<void>} callback Callback to be executed
     * @returns {Promise<void>}
     */
    const useIsolatedHre = (callback: (hre: HardhatRuntimeEnvironment) => void | Promise<void>): Promise<void> =>
        jest.isolateModulesAsync(async () => callback(await import('hardhat')))

    const getPromptMocks = async () => {
        const { promptToContinue, promptToSelectMultiple } = await import('@layerzerolabs/io-devtools')

        return {
            promptToContinueMock: promptToContinue as jest.Mock,
            promptToSelectMultipleMock: promptToSelectMultiple as jest.Mock,
        }
    }

    afterEach(() => {
        jest.resetModules()

        // On top of isolating the import of hardhat, we also need to wipe the HardhatContext
        // after every test, otherwise the context will be preserved and the new hardhat import
        // will fail since it will try to re-register already registered tasks
        HardhatContext.deleteHardhatContext()
    })

    describe('when LZ_ENABLE_EXPERIMENTAL_TASK_LZ_OAPP_CONFIG_INIT env feature flag is not set', () => {
        beforeEach(() => {
            process.env.LZ_ENABLE_EXPERIMENTAL_TASK_LZ_OAPP_CONFIG_INIT = ''
        })

        it('should not be available', async () => {
            await useIsolatedHre((hre) => {
                expect(hre.tasks[TASK_LZ_OAPP_CONFIG_INIT]).toBeUndefined()
            })
        })
    })

    describe('when LZ_ENABLE_EXPERIMENTAL_TASK_LZ_OAPP_CONFIG_INIT env feature flag is set', () => {
        beforeEach(() => {
            process.env.LZ_ENABLE_EXPERIMENTAL_TASK_LZ_OAPP_CONFIG_INIT = '1'
        })

        it('should be available', async () => {
            await useIsolatedHre((hre) => {
                expect(hre.tasks[TASK_LZ_OAPP_CONFIG_INIT]).not.toBeUndefined()
            })
        })

        it('should return an empty array if there are no networks configured with eid', async () => {
            await useIsolatedHre(async () => {
                const { promptToSelectMultipleMock } = await getPromptMocks()
                const hre = getTestHre({ config: './hardhat.config.without-eids.ts' })

                await expect(
                    hre.run(TASK_LZ_OAPP_CONFIG_INIT, { oappConfig: './layerzero.config.js' })
                ).resolves.toEqual([])

                expect(promptToSelectMultipleMock).not.toHaveBeenCalled()
            })
        })

        it('should ask the user to select networks for the config', async () => {
            await useIsolatedHre(async (hre) => {
                const { promptToSelectMultipleMock } = await getPromptMocks()
                promptToSelectMultipleMock.mockResolvedValue(['britney'])

                await hre.run(TASK_LZ_OAPP_CONFIG_INIT, { oappConfig: './layerzero.config.js' })

                expect(promptToSelectMultipleMock).toHaveBeenCalledWith(
                    `Select the networks to include in your OApp config`,
                    expect.objectContaining({
                        options: [
                            {
                                title: 'britney',
                                value: 'britney',
                                disabled: false,
                                hint: `Connected to ${formatEid(getEidForNetworkName('britney'))}`,
                            },
                            {
                                title: 'tango',
                                value: 'tango',
                                disabled: false,
                                hint: `Connected to ${formatEid(getEidForNetworkName('tango'))}`,
                            },
                            {
                                title: 'vengaboys',
                                value: 'vengaboys',
                                disabled: false,
                                hint: `Connected to ${formatEid(getEidForNetworkName('vengaboys'))}`,
                            },
                            {
                                title: 'hardhat',
                                value: 'hardhat',
                                disabled: true,
                            },
                            {
                                title: 'localhost',
                                value: 'localhost',
                                disabled: true,
                            },
                        ],
                    })
                )
            })
        })
    })
})
