import { createProviderFactory } from '@layerzerolabs/utils-evm-hardhat'
import { expect } from 'chai'
import { describe } from 'mocha'
import hre from 'hardhat'
import { configureOApp, OmniPoint } from '@layerzerolabs/ua-utils'
import { OApp } from '@layerzerolabs/ua-utils-evm'
import { omniContractToPoint, connectOmniContract } from '@layerzerolabs/utils-evm'
import { createContractFactory, OmniGraphHardhat, OmniGraphBuilderHardhat } from '@layerzerolabs/ua-utils-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('oapp/config', () => {
    it('should return all setPeer transactions', async () => {
        const ethContract = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DefaultOApp' }
        const avaxContract = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DefaultOApp' }

        // This is the OApp config that we want to use against our contracts
        const config: OmniGraphHardhat = {
            contracts: [
                {
                    contract: ethContract,
                    config: undefined,
                },
                {
                    contract: avaxContract,
                    config: undefined,
                },
            ],
            connections: [
                {
                    from: ethContract,
                    to: avaxContract,
                    config: undefined,
                },
                {
                    from: avaxContract,
                    to: ethContract,
                    config: undefined,
                },
            ],
        }

        // This is the required tooling we need to set up
        const providerFactory = createProviderFactory(hre)
        const contractFactory = createContractFactory(hre)
        const builder = await OmniGraphBuilderHardhat.fromConfig(config, contractFactory)

        // This so far the only non-oneliner, a function that returns an SDK for a contract on a network
        const sdkFactory = async (point: OmniPoint) => {
            const provider = await providerFactory(point.eid)
            const contract = await contractFactory(point)

            return new OApp(connectOmniContract(contract, provider))
        }

        // This is where the configuration happens
        const transactions = await configureOApp(builder.graph, sdkFactory)

        // And finally the test assertions
        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethSdk = await sdkFactory(ethPoint)

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxSdk = await sdkFactory(avaxPoint)

        expect(transactions).to.eql([
            await ethSdk.setPeer(avaxPoint.eid, avaxPoint.address),
            await avaxSdk.setPeer(ethPoint.eid, ethPoint.address),
        ])
    })
})
