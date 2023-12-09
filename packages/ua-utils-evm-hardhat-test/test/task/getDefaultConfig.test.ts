import { defaultExecutorConfig, defaultUlnConfig, setupDefaultEndpoint } from '../__utils__/endpoint'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/utils-evm-hardhat'
import hre from 'hardhat'

describe('task: getDefaultConfig', () => {
    beforeEach(async () => {
        await setupDefaultEndpoint()
    })

    it('should return default configurations', async () => {
        const networks = Object.keys(hre.userConfig.networks ?? {})
        const getDefaultConfigTask = await hre.run('getDefaultConfig', { networks: networks.toString() })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) continue
                const defaultConfig = getDefaultConfigTask[localNetwork][remoteNetwork]

                const sendUln302 = await contractFactory({ contractName: 'SendUln302', eid: localEid })
                const receiveUln302 = await contractFactory({ contractName: 'ReceiveUln302', eid: localEid })

                expect(defaultConfig.defaultSendLibrary).toEqual(sendUln302.contract.address)
                expect(defaultConfig.defaultReceiveLibrary).toEqual(receiveUln302.contract.address)
                expect(defaultConfig.sendExecutorConfig).toEqual(defaultExecutorConfig)
                expect(defaultConfig.sendUlnConfig).toEqual(defaultUlnConfig)
                expect(defaultConfig.receiveUlnConfig).toEqual(defaultUlnConfig)
            }
        }
    })
})
