import {
    createProviderFactory,
    createDeploymentFactoryForContract,
    omniDeploymentToContract,
    omniDeploymentToPoint,
} from '@layerzerolabs/utils-evm-hardhat'
import { expect } from 'chai'
import { describe } from 'mocha'
import hre from 'hardhat'
import { configureOApp, OmniPoint } from '@layerzerolabs/ua-utils'
import { OApp } from '@layerzerolabs/ua-utils-evm'
import { connectOmniContract } from '@layerzerolabs/utils-evm'
import { OmniGraphHardhat, OmniGraphBuilderHardhat } from '@layerzerolabs/ua-utils-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('oapp/config', () => {
    it('should return all setPeer transactions', async () => {
        // This is the OApp config that we want to use against our contracts
        const config: OmniGraphHardhat = {
            contracts: [
                {
                    eid: EndpointId.ETHEREUM_MAINNET,
                    config: undefined,
                },
                {
                    eid: EndpointId.AVALANCHE_MAINNET,
                    config: undefined,
                },
            ],
            connections: [
                {
                    fromEid: EndpointId.ETHEREUM_MAINNET,
                    toEid: EndpointId.AVALANCHE_MAINNET,
                    config: undefined,
                },
                {
                    fromEid: EndpointId.AVALANCHE_MAINNET,
                    toEid: EndpointId.ETHEREUM_MAINNET,
                    config: undefined,
                },
            ],
        }

        // This is the required tooling we need to set up
        const providerFactory = createProviderFactory(hre)
        const deploymentFactory = createDeploymentFactoryForContract(hre, 'DefaultOApp')
        const builder = await OmniGraphBuilderHardhat.fromConfig(config, deploymentFactory)

        // This so far the only non-oneliner, a function that returns an SDK for a contract on a network
        const sdkFactory = async (point: OmniPoint) => {
            const provider = await providerFactory(point.eid)
            const deployment = await deploymentFactory(point.eid)
            const contract = omniDeploymentToContract(deployment)

            return new OApp(connectOmniContract(contract, provider))
        }

        // This is where the configuration happens
        const transactions = await configureOApp(builder.graph, sdkFactory)

        // And finally the test assertions
        const ethPoint = omniDeploymentToPoint(await deploymentFactory(EndpointId.ETHEREUM_MAINNET))
        const ethSdk = await sdkFactory(ethPoint)

        const avaxPoint = omniDeploymentToPoint(await deploymentFactory(EndpointId.AVALANCHE_MAINNET))
        const avaxSdk = await sdkFactory(avaxPoint)

        expect(transactions).to.eql([
            await ethSdk.setPeer(avaxPoint.eid, avaxPoint.address),
            await avaxSdk.setPeer(ethPoint.eid, ethPoint.address),
        ])
    })
})
