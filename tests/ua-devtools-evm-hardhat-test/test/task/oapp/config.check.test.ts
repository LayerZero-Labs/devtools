import hre from 'hardhat'
import { resolve } from 'path'
import { isFile } from '@layerzerolabs/io-devtools'
import { deployOApp } from '../../__utils__/oapp'
import {
    TASK_LZ_OAPP_PEERS_GET,
    TASK_LZ_OAPP_ENFORCED_OPTS_GET,
    TASK_LZ_OAPP_WIRE,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { deployAndSetupDefaultEndpointV2 } from '../../__utils__/endpointV2'

describe(`task ${TASK_LZ_OAPP_PEERS_GET}`, () => {
    const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'configs')
    const configPathFixture = (fileName: string): string => {
        const path = resolve(CONFIGS_BASE_DIR, fileName)
        expect(isFile(path)).toBeTruthy()
        return path
    }

    beforeAll(async () => {
        await deployAndSetupDefaultEndpointV2()
    })

    beforeEach(async () => {
        await deployOApp()
    })

    it('should show no chains are connected with two networks', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.config.connected.js')
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show all chains are connected after running wire with two networks', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.config.connected.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show all chains are connected after running wire with three networks', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.multi.network.config.connected.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show all chains are connected expect one after running wire with three networks', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.multi.network.config.missing.connection.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show all chains are not connected expect one after running wire with three networks', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.multi.network.config.one.connection.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_PEERS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show enforced options for one pathway', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.multi.network.one.pathway.enforced.options.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_ENFORCED_OPTS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show a standard lzReceive setting for all pathways', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.multi.network.lzreceive.enforced.options.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_ENFORCED_OPTS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })

    it('should show different combined enforced options for all pathways', async () => {
        const consoleSpy = jest.spyOn(console, 'log')
        const oappConfig = configPathFixture('valid.multi.network.enforced.options.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        await hre.run(TASK_LZ_OAPP_ENFORCED_OPTS_GET, { oappConfig })
        expect(consoleSpy.mock.calls).toMatchSnapshot()
    })
})
