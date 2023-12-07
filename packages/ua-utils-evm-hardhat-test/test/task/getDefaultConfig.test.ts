import { describe } from 'mocha'
import { defaultExecutorConfig, defaultUlnConfig, setupDefaultEndpoint } from '../__utils__/endpoint'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import hre from 'hardhat'
import { expect, assert } from 'chai'

describe('task: getDefaultConfig', () => {
    beforeEach(async () => {
        await setupDefaultEndpoint()
    })

    it('should return default configurations', async () => {
        const networks = Object.keys(hre.userConfig.networks ?? {})
        const getDefaultConfigTask = await hre.run('getDefaultConfig', { networks: networks.toString() })

        for (const localNetwork of networks) {
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) continue

                const defaultConfig = getDefaultConfigTask[localNetwork][remoteNetwork]
                const network = await getNetworkRuntimeEnvironment(localNetwork)
                const sendUln302 = await network.ethers.getContract('SendUln302')
                const receiveUln302 = await network.ethers.getContract('ReceiveUln302')

                // verify defaultSendLibrary & defaultReceiveLibrary
                expect(defaultConfig.defaultSendLibrary).to.eql(sendUln302.address)
                expect(defaultConfig.defaultReceiveLibrary).to.eql(receiveUln302.address)

                // verify sendUln
                expect(defaultConfig.sendExecutorConfig.maxMessageSize).to.eql(defaultExecutorConfig.maxMessageSize)
                expect(defaultConfig.sendExecutorConfig.executor).to.eql(defaultExecutorConfig.executor)
                expect(defaultConfig.sendUlnConfig.confirmations.toString()).to.eql(
                    defaultUlnConfig.confirmations.toString()
                )
                expect(defaultConfig.sendUlnConfig.optionalDVNThreshold).to.eql(defaultUlnConfig.optionalDVNThreshold)
                expect(defaultConfig.sendUlnConfig.requiredDVNs).to.eql(defaultUlnConfig.requiredDVNs)
                expect(defaultConfig.sendUlnConfig.optionalDVNs).to.eql(defaultUlnConfig.optionalDVNs)

                // verify receiveUln
                expect(defaultConfig.receiveUlnConfig.confirmations.toString()).to.eql(
                    defaultUlnConfig.confirmations.toString()
                )
                expect(defaultConfig.receiveUlnConfig.optionalDVNThreshold).to.eql(
                    defaultUlnConfig.optionalDVNThreshold
                )
                expect(defaultConfig.receiveUlnConfig.requiredDVNs).to.eql(defaultUlnConfig.requiredDVNs)
                expect(defaultConfig.receiveUlnConfig.optionalDVNs).to.eql(defaultUlnConfig.optionalDVNs)
            }
        }
    })
})
