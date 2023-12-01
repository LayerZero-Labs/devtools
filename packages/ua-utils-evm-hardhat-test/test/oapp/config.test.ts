import { configureOApp } from '@layerzerolabs/ua-utils'
import { OApp } from '@layerzerolabs/ua-utils-evm'
import { createContractFactory, createProviderFactory, createSignerFactory } from '@layerzerolabs/utils-evm-hardhat'
import type { OmniGraphHardhat, OmniGraphBuilderHardhat } from '@layerzerolabs/utils-evm-hardhat'
import type { OmniPoint } from '@layerzerolabs/utils'
import { omniContractToPoint, connectOmniContract } from '@layerzerolabs/utils-evm'
import { expect } from 'chai'
import { describe } from 'mocha'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('oapp/config', () => {
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

    it('should return all setPeer transactions', async () => {
        // This is the required tooling we need to set up
        const providerFactory = createProviderFactory()
        const contractFactory = createContractFactory()
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

    it('should exclude setPeer transactions for peers that have been set', async () => {
        // This is the required tooling we need to set up
        const providerFactory = createProviderFactory()
        const contractFactory = createContractFactory()
        const builder = await OmniGraphBuilderHardhat.fromConfig(config, contractFactory)

        // This so far the only non-oneliner, a function that returns an SDK for a contract on a network
        const sdkFactory = async (point: OmniPoint) => {
            const provider = await providerFactory(point.eid)
            const contract = await contractFactory(point)

            return new OApp(connectOmniContract(contract, provider))
        }

        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethSdk = await sdkFactory(ethPoint)

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxSdk = await sdkFactory(avaxPoint)

        // Before we configure the OApp, we'll set some peers
        {
            const signerFactory = createSignerFactory()
            const ethSigner = await signerFactory(ethContract.eid)
            const ethTransaction = await ethSdk.setPeer(avaxPoint.eid, avaxPoint.address)
            const ethResponse = await ethSigner.signAndSend(ethTransaction)
            const ethReceipt = await ethResponse.wait()

            expect(ethReceipt.from).to.equal(await ethSigner.signer.getAddress())
        }

        // Now we configure the OApp
        const transactions = await configureOApp(builder.graph, sdkFactory)

        // And expect the setPeer on the eth contact not to be there
        expect(transactions).to.eql([await avaxSdk.setPeer(ethPoint.eid, ethPoint.address)])
    })
})
