import {
    deployEndpointFixture,
    getDefaultExecutorConfig,
    getDefaultUlnConfig,
    setupDefaultEndpoint,
} from '../__utils__/endpoint'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/utils-evm-hardhat'
import hre from 'hardhat'
import { TASK_LZ_GET_DEFAULT_CONFIG } from '@layerzerolabs/ua-utils-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'

describe('task: getDefaultConfig', () => {
    beforeEach(async () => {
        await deployEndpointFixture()
        await setupDefaultEndpoint()
    })

    it('should return default configurations', async () => {
        const networks = Object.keys(hre.userConfig.networks ?? {})
        const getDefaultConfigTask = await hre.run(TASK_LZ_GET_DEFAULT_CONFIG, { networks: networks.toString() })
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
})
