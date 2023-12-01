import { expect } from 'chai'
import { describe } from 'mocha'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const NETWORK_NAMES = ['vengaboys', 'britney']

describe('config', () => {
    NETWORK_NAMES.forEach((networkName) => {
        describe(`Network '${networkName}`, () => {
            let environment: HardhatRuntimeEnvironment

            before(async () => {
                environment = await getNetworkRuntimeEnvironment(networkName)
            })

            it('should have an endpoint deployed', async () => {
                const endpoint = await environment.ethers.getContract('EndpointV2')
                const eid = await endpoint.eid()

                expect(environment.network.config.eid).to.be.a('number')
                expect(eid).to.eql(environment.network.config.eid)
            })
        })
    })
})
