import hre from 'hardhat'
import { resolve } from 'path'
import { isFile } from '@layerzerolabs/io-devtools'
import {
    TASK_LZ_OAPP_PEERS_GET,
    TASK_LZ_OAPP_ENFORCED_OPTS_GET,
    TASK_LZ_OAPP_WIRE,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'

describe(`task ${TASK_LZ_OAPP_PEERS_GET}`, () => {
    let consoleSpy: jest.SpyInstance

    const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'configs')
    const configPathFixture = (fileName: string): string => {
        const path = resolve(CONFIGS_BASE_DIR, fileName)
        expect(isFile(path)).toBeTruthy()
        return path
    }

    // Helper function to filter out logo output from console.log calls
    const filterLogoOutput = (calls: any[][]) => {
        return calls.filter((call) => {
            const output = call[0]
            if (typeof output !== 'string') {
                return true
            }

            // Filter out logo-related output by checking for logo box characters and LayerZero branding
            const isLogoOutput =
                output.includes('╭') ||
                output.includes('╰') ||
                (output.includes('│') &&
                    (output.includes('▓▓▓ LayerZero DevTools ▓▓▓') ||
                        output.includes('BUILD ANYTHING') ||
                        output.includes('OMNICHAIN') ||
                        output.includes('/*\\') ||
                        output.includes("('v')") ||
                        output.includes('//-=-\\\\') ||
                        output.includes('(\\_=_/)') ||
                        output.includes('^^ ^^') ||
                        output.includes('═══════════════════════════════════') ||
                        output.includes('▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓')))

            return !isLogoOutput
        })
    }

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    beforeEach(async () => {
        await deployContract('OApp')
        consoleSpy = jest.spyOn(console, 'log')
    })

    afterEach(() => {
        consoleSpy?.mockRestore()
    })

    it('should show no chains are connected with two networks', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        consoleSpy.mockClear()
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show all chains are connected after running wire with two networks', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        consoleSpy.mockClear()
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show all chains are connected after running wire with three networks', async () => {
        const oappConfig = configPathFixture('valid.multi.network.config.connected.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        consoleSpy.mockClear()
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show all chains are connected expect one after running wire with three networks', async () => {
        const oappConfig = configPathFixture('valid.multi.network.config.missing.connection.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show all chains are not connected expect one after running wire with three networks', async () => {
        const oappConfig = configPathFixture('valid.multi.network.config.one.connection.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        consoleSpy.mockClear()

        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show enforced options for one pathway', async () => {
        const oappConfig = configPathFixture('valid.multi.network.one.pathway.enforced.options.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        consoleSpy.mockClear()
        await hre.run(TASK_LZ_OAPP_ENFORCED_OPTS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show a standard lzReceive setting for all pathways', async () => {
        const oappConfig = configPathFixture('valid.multi.network.lzreceive.enforced.options.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        consoleSpy.mockClear()
        await hre.run(TASK_LZ_OAPP_ENFORCED_OPTS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })

    it('should show different combined enforced options for all pathways', async () => {
        const oappConfig = configPathFixture('valid.multi.network.enforced.options.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        consoleSpy.mockClear()
        await hre.run(TASK_LZ_OAPP_ENFORCED_OPTS_GET, { oappConfig })
        expect(filterLogoOutput(consoleSpy.mock.calls)).toMatchSnapshot()
    })
})
