import 'hardhat'
import { configureOApp, OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    createConnectedContractFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    OmniPointHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import type { OmniGraphHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    deployOAppFixture,
    getDefaultAvaxConfig,
    getDefaultEthConfig,
    OAppTestConfig,
    setUpConfig,
    setUpOmniGraphHardhat,
} from '../__utils__/oapp'
import { setupDefaultEndpoint } from '../__utils__/endpoint'
import { OmniTransaction } from '@layerzerolabs/devtools'

describe('oapp/config', () => {
    const ethContract = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxContract = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployOAppFixture()
        await setupDefaultEndpoint()
    })

    it('should return all setPeer transactions', async () => {
        const ethTestConfig: OAppTestConfig = await getDefaultEthConfig()
        const avaxTestConfig: OAppTestConfig = await getDefaultAvaxConfig()
        const ethOAppConfig: OAppEdgeConfig = await setUpConfig(ethTestConfig)
        const avaxOAppConfig: OAppEdgeConfig = await setUpConfig(avaxTestConfig)
        const config: OmniGraphHardhat<unknown, OAppEdgeConfig> = setUpOmniGraphHardhat(
            ethContract,
            ethOAppConfig,
            avaxContract,
            avaxOAppConfig
        )
        const builder = await OmniGraphBuilderHardhat.fromConfig(config)

        const contractFactory = createConnectedContractFactory()
        const sdkFactory = createOAppFactory(contractFactory)

        // And finally the test assertions
        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethOAppSdk = await sdkFactory(ethPoint)
        const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxOAppSdk = await sdkFactory(avaxPoint)
        const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

        const expectedOAppConfigTransactions: OmniTransaction[] = await createExpectedTransactions(
            ethContract,
            ethTestConfig,
            avaxContract,
            avaxTestConfig
        )

        {
            const signerFactory = createSignerFactory()
            // register new Send and Receive ULNs on ETH
            const ethSigner = await signerFactory(ethContract.eid)
            await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethTestConfig.sendLibrary))
            await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethTestConfig.receiveLibrary))

            await ethSigner.signAndSend(
                await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethTestConfig.sendLibrary)
            )
            await ethSigner.signAndSend(
                await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethTestConfig.receiveLibrary, 0)
            )

            // register new Send and Receive ULNs AVAX
            const avaxSigner = await signerFactory(avaxContract.eid)
            await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxTestConfig.sendLibrary))
            await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxTestConfig.receiveLibrary))

            await avaxSigner.signAndSend(
                await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxTestConfig.sendLibrary)
            )
            await avaxSigner.signAndSend(
                await avaxEndpointSdk.setReceiveLibrary(
                    avaxPoint.address,
                    ethPoint.eid,
                    avaxTestConfig.receiveLibrary,
                    0
                )
            )
        }

        // This is where the configuration happens
        const transactions = await configureOApp(builder.graph, sdkFactory)
        expect(transactions).toEqual(expectedOAppConfigTransactions)
    })

    it('should exclude setPeer transactions for peers that have been set', async () => {
        const ethTestConfig: OAppTestConfig = await getDefaultEthConfig()
        const avaxTestConfig: OAppTestConfig = await getDefaultAvaxConfig()
        const ethOAppConfig: OAppEdgeConfig = await setUpConfig(ethTestConfig)
        const avaxOAppConfig: OAppEdgeConfig = await setUpConfig(avaxTestConfig)
        const config: OmniGraphHardhat<unknown, OAppEdgeConfig> = setUpOmniGraphHardhat(
            ethContract,
            ethOAppConfig,
            avaxContract,
            avaxOAppConfig
        )
        const builder = await OmniGraphBuilderHardhat.fromConfig(config)

        const contractFactory = createConnectedContractFactory()
        const sdkFactory = createOAppFactory(contractFactory)

        // And finally the test assertions
        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethOAppSdk = await sdkFactory(ethPoint)
        const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxOAppSdk = await sdkFactory(avaxPoint)
        const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

        let expectedOAppConfigTransactions: OmniTransaction[] = await createExpectedTransactions(
            ethContract,
            ethTestConfig,
            avaxContract,
            avaxTestConfig
        )

        let ethSetPeerTx
        {
            const signerFactory = createSignerFactory()
            // register new Send and Receive ULNs on ETH
            const ethSigner = await signerFactory(ethContract.eid)
            await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethTestConfig.sendLibrary))
            await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethTestConfig.receiveLibrary))

            await ethSigner.signAndSend(
                await ethEndpointSdk.setSendLibrary(ethPoint.address, avaxPoint.eid, ethTestConfig.sendLibrary)
            )
            await ethSigner.signAndSend(
                await ethEndpointSdk.setReceiveLibrary(ethPoint.address, avaxPoint.eid, ethTestConfig.receiveLibrary, 0)
            )

            // execute set peer tx before running wire all
            ethSetPeerTx = await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address)
            await ethSigner.signAndSend(ethSetPeerTx)

            // register new Send and Receive ULNs AVAX
            const avaxSigner = await signerFactory(avaxContract.eid)
            await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxTestConfig.sendLibrary))
            await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxTestConfig.receiveLibrary))

            await avaxSigner.signAndSend(
                await avaxEndpointSdk.setSendLibrary(avaxPoint.address, ethPoint.eid, avaxTestConfig.sendLibrary)
            )
            await avaxSigner.signAndSend(
                await avaxEndpointSdk.setReceiveLibrary(
                    avaxPoint.address,
                    ethPoint.eid,
                    avaxTestConfig.receiveLibrary,
                    0
                )
            )
        }

        // This is where the configuration happens
        const transactions = await configureOApp(builder.graph, sdkFactory)
        // remove set peer tx from expectedOAppConfigTransactions
        expectedOAppConfigTransactions = expectedOAppConfigTransactions.filter((obj) => obj.data !== ethSetPeerTx.data)
        expect(transactions).toEqual(expectedOAppConfigTransactions)
    })
})

const createExpectedTransactions = async (
    ethContract: OmniPointHardhat,
    ethTestConfig: OAppTestConfig,
    avaxContract: OmniPointHardhat,
    avaxTestConfig: OAppTestConfig
): Promise<OmniTransaction[]> => {
    const contractFactory = createConnectedContractFactory()
    const sdkFactory = createOAppFactory(contractFactory)

    const ethPoint = omniContractToPoint(await contractFactory(ethContract))
    const ethOAppSdk = await sdkFactory(ethPoint)
    const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

    const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
    const avaxOAppSdk = await sdkFactory(avaxPoint)
    const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()
    return [
        await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
        await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
        await ethEndpointSdk.setReceiveLibraryTimeout(ethPoint.address, avaxPoint.eid, ethTestConfig.receiveLibrary, 0),
        await avaxEndpointSdk.setReceiveLibraryTimeout(
            avaxPoint.address,
            ethPoint.eid,
            avaxTestConfig.receiveLibrary,
            0
        ),
        await ethEndpointSdk.setExecutorConfig(ethPoint.address, ethTestConfig.sendLibrary, [
            {
                eid: avaxPoint.eid,
                executorConfig: {
                    maxMessageSize: ethTestConfig.executorMaxMessageSize,
                    executor: ethTestConfig.executorLibrary,
                },
            },
        ]),
        await ethEndpointSdk.setUlnConfig(ethPoint.address, ethTestConfig.sendLibrary, [
            {
                eid: avaxPoint.eid,
                ulnConfig: {
                    confirmations: ethTestConfig.sendUlnConfirmations,
                    optionalDVNThreshold: ethTestConfig.sendUlnOptionalDVNThreshold,
                    requiredDVNs: ethTestConfig.sendUlnRequiredDVNs,
                    optionalDVNs: ethTestConfig.sendUlnOptionalDVNs,
                    requiredDVNCount: ethTestConfig.sendUlnRequiredDVNs.length,
                    optionalDVNCount: ethTestConfig.sendUlnOptionalDVNs.length,
                },
            },
        ]),
        await avaxEndpointSdk.setExecutorConfig(avaxPoint.address, avaxTestConfig.sendLibrary, [
            {
                eid: ethPoint.eid,
                executorConfig: {
                    maxMessageSize: avaxTestConfig.executorMaxMessageSize,
                    executor: avaxTestConfig.executorLibrary,
                },
            },
        ]),
        await avaxEndpointSdk.setUlnConfig(avaxPoint.address, avaxTestConfig.sendLibrary, [
            {
                eid: ethPoint.eid,
                ulnConfig: {
                    confirmations: avaxTestConfig.sendUlnConfirmations,
                    optionalDVNThreshold: avaxTestConfig.sendUlnOptionalDVNThreshold,
                    requiredDVNs: avaxTestConfig.sendUlnRequiredDVNs,
                    optionalDVNs: avaxTestConfig.sendUlnOptionalDVNs,
                    requiredDVNCount: avaxTestConfig.sendUlnRequiredDVNs.length,
                    optionalDVNCount: avaxTestConfig.sendUlnOptionalDVNs.length,
                },
            },
        ]),
        await ethEndpointSdk.setUlnConfig(ethPoint.address, ethTestConfig.receiveLibrary, [
            {
                eid: avaxPoint.eid,
                ulnConfig: {
                    confirmations: ethTestConfig.receiveUlnConfirmations,
                    optionalDVNThreshold: ethTestConfig.receiveUlnOptionalDVNThreshold,
                    requiredDVNs: ethTestConfig.receiveUlnRequiredDVNs,
                    optionalDVNs: ethTestConfig.receiveUlnOptionalDVNs,
                    requiredDVNCount: ethTestConfig.receiveUlnRequiredDVNs.length,
                    optionalDVNCount: ethTestConfig.receiveUlnOptionalDVNs.length,
                },
            },
        ]),
        await avaxEndpointSdk.setUlnConfig(avaxPoint.address, avaxTestConfig.receiveLibrary, [
            {
                eid: ethPoint.eid,
                ulnConfig: {
                    confirmations: avaxTestConfig.receiveUlnConfirmations,
                    optionalDVNThreshold: avaxTestConfig.receiveUlnOptionalDVNThreshold,
                    requiredDVNs: avaxTestConfig.receiveUlnRequiredDVNs,
                    optionalDVNs: avaxTestConfig.receiveUlnOptionalDVNs,
                    requiredDVNCount: avaxTestConfig.receiveUlnRequiredDVNs.length,
                    optionalDVNCount: avaxTestConfig.receiveUlnOptionalDVNs.length,
                },
            },
        ]),
    ]
}
