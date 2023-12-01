import { EndpointEdgeConfig, configureEndpoint } from '@layerzerolabs/utils'
import { Endpoint } from '@layerzerolabs/utils-evm'
import {
    createContractFactory,
    OmniGraphHardhat,
    OmniGraphBuilderHardhat,
    createConnectedContractFactory,
} from '@layerzerolabs/utils-evm-hardhat'
import type { OmniPoint } from '@layerzerolabs/utils'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import { createSignerFactory } from '@layerzerolabs/utils-evm-hardhat'
import { expect } from 'chai'
import { describe } from 'mocha'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('endpoint/config', () => {
    const ethEndpoint = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'EndpointV2' }
    const ethUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'SendUln302' }
    const avaxEndpoint = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'EndpointV2' }
    const avaxUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'SendUln302' }

    it('should return all setDefaultSendLibrary transactions', async () => {
        // This is the required tooling we need to set up
        const contractFactory = createContractFactory()
        const connectedContractFactory = createConnectedContractFactory(contractFactory)
        const sdkFactory = async (point: OmniPoint) => new Endpoint(await connectedContractFactory(point))

        // At this point we need a config
        //
        // Since the config values now depend on contracts deployed in the bootstrap,
        // the config creation is a bit more involved
        const ethUlnPoint = omniContractToPoint(await contractFactory(ethUln))
        const avaxUlnPoint = omniContractToPoint(await contractFactory(avaxUln))
        const config: OmniGraphHardhat<unknown, EndpointEdgeConfig> = {
            contracts: [
                {
                    contract: ethEndpoint,
                    config: undefined,
                },
                {
                    contract: avaxEndpoint,
                    config: undefined,
                },
            ],
            connections: [
                {
                    from: ethEndpoint,
                    to: avaxEndpoint,
                    config: {
                        defaultSendLibrary: ethUlnPoint.address,
                    },
                },
                {
                    from: avaxEndpoint,
                    to: ethEndpoint,
                    config: {
                        defaultSendLibrary: avaxUlnPoint.address,
                    },
                },
            ],
        }

        const builder = await OmniGraphBuilderHardhat.fromConfig(config, contractFactory)

        // This is where the configuration happens
        const transactions = await configureEndpoint(builder.graph, sdkFactory)

        // And finally the test assertions
        const ethEndpointPoint = omniContractToPoint(await contractFactory(ethEndpoint))
        const ethEndpointSdk = await sdkFactory(ethEndpointPoint)

        const avaxEndpointPoint = omniContractToPoint(await contractFactory(avaxEndpoint))
        const avaxEndpointSdk = await sdkFactory(avaxEndpointPoint)

        expect(transactions).to.eql([
            await ethEndpointSdk.setDefaultSendLibrary(avaxUlnPoint.eid, avaxUlnPoint.address),
            await avaxEndpointSdk.setDefaultSendLibrary(ethUlnPoint.eid, ethUlnPoint.address),
        ])
    })

    it('should exclude setDefaultSendLibrary transactions for libraries that have been set', async () => {
        // This is the required tooling we need to set up
        // This is the required tooling we need to set up
        const contractFactory = createContractFactory()
        const connectedContractFactory = createConnectedContractFactory(contractFactory)
        const sdkFactory = async (point: OmniPoint) => new Endpoint(await connectedContractFactory(point))

        // At this point we need a config
        //
        // Since the config values now depend on contracts deployed in the bootstrap,
        // the config creation is a bit more involved
        const ethUlnPoint = omniContractToPoint(await contractFactory(ethUln))
        const avaxUlnPoint = omniContractToPoint(await contractFactory(avaxUln))
        const config: OmniGraphHardhat<unknown, EndpointEdgeConfig> = {
            contracts: [
                {
                    contract: ethEndpoint,
                    config: undefined,
                },
                {
                    contract: avaxEndpoint,
                    config: undefined,
                },
            ],
            connections: [
                {
                    from: ethEndpoint,
                    to: avaxEndpoint,
                    config: {
                        defaultSendLibrary: ethUlnPoint.address,
                    },
                },
                {
                    from: avaxEndpoint,
                    to: ethEndpoint,
                    config: {
                        defaultSendLibrary: avaxUlnPoint.address,
                    },
                },
            ],
        }

        const builder = await OmniGraphBuilderHardhat.fromConfig(config, contractFactory)

        const ethEndpointPoint = omniContractToPoint(await contractFactory(ethEndpoint))
        const ethEndpointSdk = await sdkFactory(ethEndpointPoint)

        const avaxEndpointPoint = omniContractToPoint(await contractFactory(avaxEndpoint))
        const avaxEndpointSdk = await sdkFactory(avaxEndpointPoint)

        // Before we configure the Endpoint, we'll set some defaultSendLibraries
        {
            const signerFactory = createSignerFactory()
            const ethSigner = await signerFactory(ethEndpoint.eid)
            const ethTransaction = await ethEndpointSdk.setDefaultSendLibrary(avaxUlnPoint.eid, avaxUlnPoint.address)
            const ethResponse = await ethSigner.signAndSend(ethTransaction)
            const ethReceipt = await ethResponse.wait()

            expect(ethReceipt.from).to.equal(await ethSigner.signer.getAddress())
        }

        // Now we configure the Endpoint
        const transactions = await configureEndpoint(builder.graph, sdkFactory)

        // And we check that the configuration transaction we already submitted is not included
        expect(transactions).to.eql([await avaxEndpointSdk.setDefaultSendLibrary(ethUlnPoint.eid, ethUlnPoint.address)])
    })
})
