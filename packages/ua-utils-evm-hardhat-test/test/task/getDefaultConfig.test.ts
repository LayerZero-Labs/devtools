import { describe } from 'mocha'
import { defaultExecutorConfig, defaultUlnConfig, setupDefaultEndpoint } from '../__utils__/endpoint'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
const hre = require('hardhat')
const { expect } = require('chai')

describe('task: getDefaultConfig', () => {
    beforeEach(async () => {
        await setupDefaultEndpoint()
    })

    it('should return default configurations', async () => {
        console.log(Object.keys(hre.userConfig.networks))
        const networks = Object.keys(hre.userConfig.networks)
        const taskRunEnv = await getNetworkRuntimeEnvironment(networks[0])
        const getDefaultConfigTask = await taskRunEnv.run('getDefaultConfig', { networks: networks.toString() })

        for (const networkIndex in networks) {
            const defaultConfigObj = getDefaultConfigTask[networkIndex]
            const networkName = networks[networkIndex]
            const defaultConfig = defaultConfigObj[`${networkName}`]

            // verify the returned config is the current network
            expect(networkName).to.eql(defaultConfig.defaultLibrary.network)

            const network = await getNetworkRuntimeEnvironment(networkName)
            const sendUln302 = await network.ethers.getContract('SendUln302')
            const receiveUln302 = await network.ethers.getContract('ReceiveUln302')

            // verify defaultSendLibrary & defaultReceiveLibrary
            expect(defaultConfig.defaultLibrary.defaultSendLibrary).to.eql(sendUln302.address)
            expect(defaultConfig.defaultLibrary.defaultReceiveLibrary).to.eql(receiveUln302.address)

            // verify sendUln
            expect(defaultConfig.ulnConfig.sendUln.maxMessageSize).to.eql(defaultExecutorConfig.maxMessageSize)
            expect(defaultConfig.ulnConfig.sendUln.executor).to.eql(defaultExecutorConfig.executor)
            expect(defaultConfig.ulnConfig.sendUln.confirmations.toString()).to.eql(
                defaultUlnConfig.confirmations.toString()
            )
            expect(defaultConfig.ulnConfig.sendUln.requiredDVNCount).to.eql(defaultUlnConfig.requiredDVNs.length)
            expect(defaultConfig.ulnConfig.sendUln.optionalDVNCount).to.eql(defaultUlnConfig.optionalDVNs.length)
            expect(defaultConfig.ulnConfig.sendUln.optionalDVNThreshold).to.eql(defaultUlnConfig.optionalDVNThreshold)
            expect(defaultConfig.ulnConfig.sendUln.requiredDVNs).to.eql(defaultUlnConfig.requiredDVNs)
            expect(defaultConfig.ulnConfig.sendUln.optionalDVNs).to.eql(defaultUlnConfig.optionalDVNs)

            // verify receiveUln
            expect(defaultConfig.ulnConfig.receiveUln.confirmations.toString()).to.eql(
                defaultUlnConfig.confirmations.toString()
            )
            expect(defaultConfig.ulnConfig.receiveUln.requiredDVNCount).to.eql(defaultUlnConfig.requiredDVNs.length)
            expect(defaultConfig.ulnConfig.receiveUln.optionalDVNCount).to.eql(defaultUlnConfig.optionalDVNs.length)
            expect(defaultConfig.ulnConfig.receiveUln.optionalDVNThreshold).to.eql(
                defaultUlnConfig.optionalDVNThreshold
            )
            expect(defaultConfig.ulnConfig.receiveUln.requiredDVNs).to.eql(defaultUlnConfig.requiredDVNs)
            expect(defaultConfig.ulnConfig.receiveUln.optionalDVNs).to.eql(defaultUlnConfig.optionalDVNs)
        }
    })
})
