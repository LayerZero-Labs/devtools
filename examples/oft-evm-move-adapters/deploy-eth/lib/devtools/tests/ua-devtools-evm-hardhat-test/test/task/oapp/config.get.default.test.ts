import {
    setupDefaultEndpointV2,
    getDefaultExecutorConfig,
    getDefaultUlnConfig,
    deployContract,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import hre from 'hardhat'
import { TASK_LZ_OAPP_CONFIG_GET_DEFAULT } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'
import { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { spawnSync } from 'child_process'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        printJson: jest.fn(),
    }
})

describe(`task ${TASK_LZ_OAPP_CONFIG_GET_DEFAULT}`, () => {
    const networks = ['vengaboys', 'britney', 'tango']

    beforeEach(async () => {
        // We'll deploy the endpoint and save the deployments to the filesystem
        // since we want to be able to tun the task using spawnSync
        await deployContract('EndpointV2', true)
        await setupDefaultEndpointV2()
    })

    it('should return default configurations with passed in networks param', async () => {
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_CONFIG_GET_DEFAULT, { networks })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) {
                    continue
                }
                const defaultConfig = getDefaultConfigTask[localNetwork][remoteNetwork]

                const sendUln302 = await contractFactory({ contractName: 'SendUln302', eid: localEid })
                const receiveUln302 = await contractFactory({ contractName: 'ReceiveUln302', eid: localEid })
                const executor = await contractFactory({ contractName: 'Executor', eid: localEid })
                const executorPoint = await omniContractToPoint(executor)
                const dvn = await contractFactory({ contractName: 'DVN', eid: localEid })
                const dvnPoint = await omniContractToPoint(dvn)

                expect(defaultConfig.defaultSendLibrary).toEqual(sendUln302.contract.address)
                expect(defaultConfig.defaultReceiveLibrary).toEqual(receiveUln302.contract.address)
                expect(defaultConfig.sendExecutorConfig).toEqual(getDefaultExecutorConfig(executorPoint.address))
                expect(defaultConfig.sendUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
                expect(defaultConfig.receiveUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
            }
        }
    })

    it('should print out default config in json form', async () => {
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_CONFIG_GET_DEFAULT, {
            networks,
            json: true,
        })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) {
                    continue
                }
                const defaultConfig = getDefaultConfigTask[localNetwork][remoteNetwork]

                const sendUln302 = await contractFactory({ contractName: 'SendUln302', eid: localEid })
                const receiveUln302 = await contractFactory({ contractName: 'ReceiveUln302', eid: localEid })
                const executor = await contractFactory({ contractName: 'Executor', eid: localEid })
                const executorPoint = await omniContractToPoint(executor)
                const dvn = await contractFactory({ contractName: 'DVN', eid: localEid })
                const dvnPoint = await omniContractToPoint(dvn)

                expect(defaultConfig.defaultSendLibrary).toEqual(sendUln302.contract.address)
                expect(defaultConfig.defaultReceiveLibrary).toEqual(receiveUln302.contract.address)
                expect(defaultConfig.sendExecutorConfig).toEqual(getDefaultExecutorConfig(executorPoint.address))
                expect(defaultConfig.sendUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
                expect(defaultConfig.receiveUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
                const config: OAppEdgeConfig = {
                    sendLibrary: defaultConfig.defaultSendLibrary,
                    receiveLibraryConfig: {
                        receiveLibrary: defaultConfig.defaultReceiveLibrary,
                        gracePeriod: BigInt(0),
                    },
                    sendConfig: {
                        executorConfig: defaultConfig.sendExecutorConfig,
                        ulnConfig: defaultConfig.sendUlnConfig,
                    },
                    receiveConfig: {
                        ulnConfig: defaultConfig.receiveUlnConfig,
                    },
                }
                expect(printJson).toHaveBeenCalledWith(config)
            }
        }
    })

    it(`should fail if not defined networks have been passed`, async () => {
        const result = spawnSync('npx', ['hardhat', TASK_LZ_OAPP_CONFIG_GET_DEFAULT, '--networks', 'whatever,yomama'])

        expect(result.status).toBe(1)
    })

    it(`should not fail if defined networks have been passed`, async () => {
        const result = spawnSync('npx', ['hardhat', TASK_LZ_OAPP_CONFIG_GET_DEFAULT, `--networks`, networks.join(',')])

        expect(result.status).toBe(0)
    })
})
