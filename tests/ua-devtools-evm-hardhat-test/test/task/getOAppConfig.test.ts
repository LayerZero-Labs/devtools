import {
    deployEndpointFixture,
    getDefaultExecutorConfig,
    getDefaultUlnConfig,
    setupDefaultEndpoint,
} from '../__utils__/endpoint'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import hre from 'hardhat'
import { AddressZero } from '@ethersproject/constants'
import { TASK_LZ_GET_OAPP_CONFIG } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'

describe('task: getOAppConfig', () => {
    beforeEach(async () => {
        await deployEndpointFixture()
        await setupDefaultEndpoint()
    })

    it('should return app default configurations when addresses are not oapps', async () => {
        const networks = Object.keys(hre.userConfig.networks ?? {})
        const addresses = new Array(networks.length).fill(AddressZero).toString()
        const getDefaultConfigTask = await hre.run(TASK_LZ_GET_OAPP_CONFIG, {
            networks: networks.toString(),
            addresses: addresses.toString(),
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
                const executorPoint = omniContractToPoint(executor)
                const dvn = await contractFactory({ contractName: 'DVN', eid: localEid })
                const dvnPoint = omniContractToPoint(dvn)

                expect(defaultConfig.defaultSendLibrary).toEqual(sendUln302.contract.address)
                expect(defaultConfig.defaultReceiveLibrary).toEqual(receiveUln302.contract.address)
                expect(defaultConfig.sendExecutorConfig).toEqual(getDefaultExecutorConfig(executorPoint.address))
                expect(defaultConfig.sendUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
                expect(defaultConfig.receiveUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
            }
        }
    })

    // TODO - app specific configuration testing
    // it('should return app specific configurations', async () => {
    // })
})
