import 'hardhat'
import { createConnectedContractFactory } from '@layerzerolabs/utils-evm-hardhat'
import type { OmniPoint } from '@layerzerolabs/utils'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { getDefaultUlnConfig, setupDefaultEndpoint } from '../__utils__/endpoint'
import { Uln302, createEndpointFactory, createUln302Factory } from '@layerzerolabs/protocol-utils-evm'

describe('endpoint/config', () => {
    const ethEndpoint = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'EndpointV2' }
    const ethReceiveUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'ReceiveUln302' }
    const ethSendUln = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'SendUln302' }
    const ethDvn = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DVN' }
    const avaxEndpoint = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'EndpointV2' }
    const avaxReceiveUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'ReceiveUln302' }
    const avaxSendUln = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'SendUln302' }
    const avaxDvn = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DVN' }

    beforeEach(async () => {
        await setupDefaultEndpoint()
    })

    describe('endpoint', () => {
        it('should have default libraries configured', async () => {
            // This is the required tooling we need to set up
            const connectedContractFactory = createConnectedContractFactory()
            const sdkFactory = createEndpointFactory(connectedContractFactory)

            // Now for the purposes of the test, we need to get coordinates of our contracts
            const ethEndpointPoint = omniContractToPoint(await connectedContractFactory(ethEndpoint))
            const avaxEndpointPoint = omniContractToPoint(await connectedContractFactory(avaxEndpoint))

            const ethEndpointSdk = await sdkFactory(ethEndpointPoint)
            const avaxEndpointSdk = await sdkFactory(avaxEndpointPoint)

            // First let's check the send libraries
            const ethDefaultSendLib = await ethEndpointSdk.getDefaultSendLibrary(avaxEndpointPoint.eid)
            const avaxDefaultSendLib = await avaxEndpointSdk.getDefaultSendLibrary(ethEndpointPoint.eid)

            const ethSendUlnPoint = omniContractToPoint(await connectedContractFactory(ethSendUln))
            const avaxSendUlnPoint = omniContractToPoint(await connectedContractFactory(avaxSendUln))

            expect(ethDefaultSendLib).toBe(ethSendUlnPoint.address)
            expect(avaxDefaultSendLib).toBe(avaxSendUlnPoint.address)

            // Then let's check the receive libraries
            const ethDefaultReceiveLib = await ethEndpointSdk.getDefaultReceiveLibrary(avaxEndpointPoint.eid)
            const avaxDefaultReceiveLib = await avaxEndpointSdk.getDefaultReceiveLibrary(ethEndpointPoint.eid)

            const ethReceiveUlnPoint = omniContractToPoint(await connectedContractFactory(ethReceiveUln))
            const avaxReceiveUlnPoint = omniContractToPoint(await connectedContractFactory(avaxReceiveUln))

            expect(ethDefaultReceiveLib).toBe(ethReceiveUlnPoint.address)
            expect(avaxDefaultReceiveLib).toBe(avaxReceiveUlnPoint.address)
        })
    })

    describe('sendUln302', () => {
        it('should have default executors configured', async () => {
            // This is the required tooling we need to set up
            const connectedContractFactory = createConnectedContractFactory()
            const sdkFactory = createUln302Factory(connectedContractFactory)

            const ethSendUlnPoint = omniContractToPoint(await connectedContractFactory(ethSendUln))
            const avaxSendUlnPoint = omniContractToPoint(await connectedContractFactory(avaxSendUln))

            const ethSendUlnSdk = await sdkFactory(ethSendUlnPoint)
            const avaxSendUlnSdk = await sdkFactory(avaxSendUlnPoint)

            const ethConfig = await ethSendUlnSdk.getUlnConfig(avaxSendUlnPoint.eid, avaxSendUlnPoint.address)
            const avaxConfig = await avaxSendUlnSdk.getUlnConfig(ethSendUlnPoint.eid, ethSendUlnPoint.address)

            const ethDvnPoint = omniContractToPoint(await connectedContractFactory(ethDvn))
            const avaxDvnPoint = omniContractToPoint(await connectedContractFactory(avaxDvn))

            expect(ethConfig).toEqual(getDefaultUlnConfig(ethDvnPoint.address))
            expect(avaxConfig).toEqual(getDefaultUlnConfig(avaxDvnPoint.address))
        })
    })
})
