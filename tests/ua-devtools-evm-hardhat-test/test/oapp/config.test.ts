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
import { deployOAppFixture } from '../__utils__/oapp'
import {
    avaxDvn,
    avaxExecutor,
    avaxReceiveUln2_Opt2,
    avaxSendUln2_Opt2,
    ethDvn,
    ethExecutor,
    ethReceiveUln2_Opt2,
    ethSendUln2_Opt2,
    setupDefaultEndpoint,
} from '../__utils__/endpoint'
import { OmniTransaction } from '@layerzerolabs/devtools'

type OAppTestConfig = {
    sendLibrary: string
    receiveLibrary: string
    executorLibrary: string
    executorMaxMessageSize: number
    receiveTimeoutConfigLibrary: string
    receiveLibraryGracePeriod: number
    receiveLibraryTimeoutExpiry: number
    sendUlnConfirmations: number
    sendUlnRequiredDVNs: string[]
    sendUlnOptionalDVNs: string[]
    sendUlnOptionalDVNThreshold: number
    receiveUlnConfirmations: number
    receiveUlnRequiredDVNs: string[]
    receiveUlnOptionalDVNs: string[]
    receiveUlnOptionalDVNThreshold: number
}
describe('oapp/config', () => {
    const ethContract = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DefaultOApp' }
    const avaxContract = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DefaultOApp' }

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
            await ethSigner.signAndSend(await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address))

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
        expect(transactions).toEqual(expectedOAppConfigTransactions.slice(1))
    })
})

const getLibraryAddress = async (library: OmniPointHardhat): Promise<string> => {
    const contractFactory = createConnectedContractFactory()
    const executorPoint = omniContractToPoint(await contractFactory(library))
    return executorPoint.address
}

const setUpConfig = async (testConfig: OAppTestConfig): Promise<OAppEdgeConfig> => {
    return {
        sendLibrary: testConfig.sendLibrary,
        receiveLibraryConfig: {
            receiveLibrary: testConfig.receiveLibrary,
            gracePeriod: testConfig.receiveLibraryGracePeriod,
        },
        receiveLibraryTimeoutConfig: {
            lib: testConfig.receiveTimeoutConfigLibrary,
            expiry: testConfig.receiveLibraryTimeoutExpiry,
        },
        sendConfig: {
            executorConfig: {
                maxMessageSize: testConfig.executorMaxMessageSize,
                executor: testConfig.executorLibrary,
            },
            ulnConfig: {
                confirmations: testConfig.sendUlnConfirmations,
                optionalDVNThreshold: testConfig.sendUlnOptionalDVNThreshold,
                requiredDVNs: testConfig.sendUlnRequiredDVNs,
                requiredDVNCount: testConfig.sendUlnOptionalDVNs.length,
                optionalDVNs: testConfig.sendUlnOptionalDVNs,
                optionalDVNCount: testConfig.sendUlnOptionalDVNs.length,
            },
        },
        receiveConfig: {
            ulnConfig: {
                confirmations: testConfig.receiveUlnConfirmations,
                optionalDVNThreshold: testConfig.receiveUlnOptionalDVNThreshold,
                requiredDVNs: testConfig.receiveUlnRequiredDVNs,
                requiredDVNCount: testConfig.receiveUlnRequiredDVNs.length,
                optionalDVNs: testConfig.receiveUlnOptionalDVNs,
                optionalDVNCount: testConfig.receiveUlnOptionalDVNs.length,
            },
        },
    }
}

const setUpOmniGraphHardhat = (
    ethContract: OmniPointHardhat,
    ethOAppConfig: OAppEdgeConfig,
    avaxContract,
    avaxOAppConfig: OAppEdgeConfig
): OmniGraphHardhat<unknown, OAppEdgeConfig> => {
    return {
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
                config: ethOAppConfig,
            },
            {
                from: avaxContract,
                to: ethContract,
                config: avaxOAppConfig,
            },
        ],
    }
}

const getDefaultEthConfig = async (): Promise<OAppTestConfig> => {
    const ethDVNAddress = await getLibraryAddress(ethDvn)
    const avaxDvnPoint = await getLibraryAddress(avaxDvn)
    const ethSendUlnRequiredDVNs: string[] = [avaxDvnPoint]
    const ethSendUlnOptionalDVNs: string[] = [avaxDvnPoint]
    const ethReceiveUlnRequiredDVNs: string[] = [ethDVNAddress]
    const ethReceiveUlnOptionalDVNs: string[] = [ethDVNAddress]

    return {
        sendLibrary: await getLibraryAddress(ethSendUln2_Opt2),
        receiveLibrary: await getLibraryAddress(ethReceiveUln2_Opt2),
        executorLibrary: await getLibraryAddress(avaxExecutor),
        executorMaxMessageSize: 100,
        receiveTimeoutConfigLibrary: await getLibraryAddress(ethReceiveUln2_Opt2),
        receiveLibraryGracePeriod: 0,
        receiveLibraryTimeoutExpiry: 0,
        receiveUlnConfirmations: 24,
        receiveUlnOptionalDVNs: ethReceiveUlnOptionalDVNs,
        receiveUlnOptionalDVNThreshold: 0,
        receiveUlnRequiredDVNs: ethReceiveUlnRequiredDVNs,
        sendUlnConfirmations: 42,
        sendUlnOptionalDVNs: ethSendUlnOptionalDVNs,
        sendUlnOptionalDVNThreshold: 0,
        sendUlnRequiredDVNs: ethSendUlnRequiredDVNs,
    }
}

const getDefaultAvaxConfig = async (): Promise<OAppTestConfig> => {
    const ethDVNAddress = await getLibraryAddress(ethDvn)
    const avaxDvnPoint = await getLibraryAddress(avaxDvn)
    const avaxSendUlnRequiredDVNs: string[] = [ethDVNAddress]
    const avaxSendUlnOptionalDVNs: string[] = [ethDVNAddress]
    const avaxReceiveUlnRequiredDVNs: string[] = [avaxDvnPoint]
    const avaxReceiveUlnOptionalDVNs: string[] = [avaxDvnPoint]

    return {
        sendLibrary: await getLibraryAddress(avaxSendUln2_Opt2),
        receiveLibrary: await getLibraryAddress(avaxReceiveUln2_Opt2),
        executorLibrary: await getLibraryAddress(ethExecutor),
        executorMaxMessageSize: 999,
        receiveTimeoutConfigLibrary: await getLibraryAddress(avaxReceiveUln2_Opt2),
        receiveLibraryGracePeriod: 0,
        receiveLibraryTimeoutExpiry: 0,
        receiveUlnConfirmations: 96,
        receiveUlnOptionalDVNs: avaxReceiveUlnOptionalDVNs,
        receiveUlnOptionalDVNThreshold: 0,
        receiveUlnRequiredDVNs: avaxSendUlnRequiredDVNs,
        sendUlnConfirmations: 69,
        sendUlnOptionalDVNs: avaxSendUlnOptionalDVNs,
        sendUlnOptionalDVNThreshold: 0,
        sendUlnRequiredDVNs: avaxReceiveUlnRequiredDVNs,
    }
}

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
