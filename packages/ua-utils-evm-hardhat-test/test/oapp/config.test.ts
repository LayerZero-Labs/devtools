import 'hardhat'
import { configureOApp } from '@layerzerolabs/ua-utils'
import { createOAppFactory } from '@layerzerolabs/ua-utils-evm'
import {
    createConnectedContractFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
} from '@layerzerolabs/utils-evm-hardhat'
import type { OmniGraphHardhat } from '@layerzerolabs/utils-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { setupDefaultEndpoint } from '../__utils__/endpoint'
import { deployOApp } from '../__utils__/oapp'

describe('oapp/config', () => {
    const ethContract = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DefaultOApp' }
    const avaxContract = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DefaultOApp' }

    // This is the OApp config that we want to use against our contracts
    const config: OmniGraphHardhat = {
        contracts: [
            {
                contract: ethContract,
            },
            {
                contract: avaxContract,
            },
        ],
        connections: [
            {
                from: ethContract,
                to: avaxContract,
            },
            {
                from: avaxContract,
                to: ethContract,
            },
        ],
    }

    beforeAll(async () => {
        await setupDefaultEndpoint()
    })

    beforeEach(async () => {
        await deployOApp()
    })

    it('should return all setPeer transactions', async () => {
        // This is the required tooling we need to set up
        const contractFactory = createConnectedContractFactory()
        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const sdkFactory = createOAppFactory(contractFactory)

        // This is where the configuration happens
        const transactions = await configureOApp(builder.graph, sdkFactory)

        // And finally the test assertions
        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethSdk = await sdkFactory(ethPoint)

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxSdk = await sdkFactory(avaxPoint)

        expect(transactions).toEqual([
            await ethSdk.setPeer(avaxPoint.eid, avaxPoint.address),
            await avaxSdk.setPeer(ethPoint.eid, ethPoint.address),
        ])
    })

    it('should exclude setPeer transactions for peers that have been set', async () => {
        // This is the required tooling we need to set up
        const contractFactory = createConnectedContractFactory()
        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const sdkFactory = createOAppFactory(contractFactory)

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

            expect(ethReceipt.from).toBe(await ethSigner.signer.getAddress())
        }

        // Now we configure the OApp
        const transactions = await configureOApp(builder.graph, sdkFactory)

        // And expect the setPeer on the eth contact not to be there
        expect(transactions).toEqual([await avaxSdk.setPeer(ethPoint.eid, ethPoint.address)])
    })
})
