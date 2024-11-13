import {
    setupDefaultEndpointV2,
    getDefaultUlnReadConfig,
    deployContract,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import hre from 'hardhat'
import { TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'
import { OAppReadNodeConfig } from '@layerzerolabs/ua-devtools'
import { spawnSync } from 'child_process'
import { ChannelId } from '@layerzerolabs/lz-definitions'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        printJson: jest.fn(),
    }
})

describe(`task ${TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL}`, () => {
    const networks = ['vengaboys', 'britney', 'tango']

    beforeEach(async () => {
        // We'll deploy the endpoint and save the deployments to the filesystem
        // since we want to be able to tun the task using spawnSync
        await deployContract('EndpointV2', true)
        await setupDefaultEndpointV2()
    })

    it('should return default configurations with passed in networks param', async () => {
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL, { networks })
        const contractFactory = createContractFactory()

        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)

            const channelIds = [ChannelId.READ_CHANNEL_1]
            const defaultConfig = getDefaultConfigTask[localNetwork]

            const readLib = await contractFactory({ contractName: 'ReadLib1002', eid: localEid })
            const executor = await contractFactory({ contractName: 'Executor', eid: localEid })
            const executorPoint = await omniContractToPoint(executor)
            const dvn = await contractFactory({ contractName: 'DVN', eid: localEid })
            const dvnPoint = await omniContractToPoint(dvn)

            expect(Object.keys(defaultConfig).length).toEqual(channelIds.length)

            for (const channelId of channelIds) {
                expect(defaultConfig[channelId].defaultReadLibrary).toEqual(readLib.contract.address)
                expect(defaultConfig[channelId].readUlnConfig).toEqual(
                    getDefaultUlnReadConfig(dvnPoint.address, executorPoint.address)
                )
            }
        }
    })

    it('should print out default config in json form', async () => {
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL, {
            networks,
            json: true,
        })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)

            const channelIds = [ChannelId.READ_CHANNEL_1]
            const defaultConfig = getDefaultConfigTask[localNetwork]

            const readLib = await contractFactory({ contractName: 'ReadLib1002', eid: localEid })
            const executor = await contractFactory({ contractName: 'Executor', eid: localEid })
            const executorPoint = await omniContractToPoint(executor)
            const dvn = await contractFactory({ contractName: 'DVN', eid: localEid })
            const dvnPoint = await omniContractToPoint(dvn)

            expect(Object.keys(defaultConfig).length).toEqual(channelIds.length)

            for (const channelId of channelIds) {
                expect(defaultConfig[channelId].defaultReadLibrary).toEqual(readLib.contract.address)
                expect(defaultConfig[channelId].readUlnConfig).toEqual(
                    getDefaultUlnReadConfig(dvnPoint.address, executorPoint.address)
                )
            }
            const config: OAppReadNodeConfig = {
                readChannelConfigs: channelIds.map((channelId) => ({
                    channelId,
                    readLibrary: readLib.contract.address,
                    readUlnConfig: getDefaultUlnReadConfig(dvnPoint.address, executorPoint.address),
                })),
            }
            expect(printJson).toHaveBeenCalledWith(config)
        }
    })

    it(`should fail if not defined networks have been passed`, async () => {
        const result = spawnSync('npx', [
            'hardhat',
            TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL,
            '--networks',
            'whatever,yomama',
        ])

        expect(result.status).toBe(1)
    })

    it(`should not fail if defined networks have been passed`, async () => {
        const result = spawnSync('npx', [
            'hardhat',
            TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL,
            `--networks`,
            networks.join(','),
        ])

        expect(result.status).toBe(0)
    })
})
