import {
    deployEndpoint,
    getDefaultExecutorConfig,
    getDefaultUlnConfig,
    setupDefaultEndpoint,
} from '../../__utils__/endpoint'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import hre from 'hardhat'
import { TASK_LZ_OAPP_CONFIG_GET_DEFAULT } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'
import { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        printJson: jest.fn(),
    }
})

describe(`task ${TASK_LZ_OAPP_CONFIG_GET_DEFAULT}`, () => {
    beforeEach(async () => {
        await deployEndpoint()
        await setupDefaultEndpoint()
    })

    it('should return default configurations with passed in networks param', async () => {
        const networks = ['vengaboys', 'britney', 'tango']
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_CONFIG_GET_DEFAULT, { networks })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) continue
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
        const networks = ['vengaboys', 'britney', 'tango']
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_CONFIG_GET_DEFAULT, {
            networks,
            json: true,
        })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) continue
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
})
