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
import { OAppEdgeConfig } from '@layerzerolabs/ua-utils'
import { OmniTransaction } from '@layerzerolabs/utils'

describe('oapp/config', () => {
    const ethContract = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DefaultOApp' }
    const avaxContract = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DefaultOApp' }
    const config: OmniGraphHardhat<unknown, OAppEdgeConfig> = { connections: [], contracts: [] }
    let ethExecutorPoint
    let avaxExecutorPoint
    let ethDvnPoint
    let avaxDvnPoint
    let ethSendUlnPoint2
    let avaxSendUlnPoint2
    let ethReceiveUlnPoint2
    let avaxReceiveUlnPoint2
    let ethExecutorMaxMessageSize
    let ethReceiveLibraryGracePeriod
    let ethReceiveLibraryTimeoutExpiry
    let ethSendUlnConfirmations
    let ethUlnRequiredDVNCount
    let ethUlnOptionalDVNCount
    let ethUlnOptionalDVNThreshold
    let ethReceiveUlnConfirmations
    let avaxExecutorMaxMessageSize
    let avaxReceiveLibraryGracePeriod
    let avaxReceiveLibraryTimeoutExpiry
    let avaxSendUlnConfirmations
    let avaxUlnRequiredDVNCount
    let avaxUlnOptionalDVNCount
    let avaxUlnOptionalDVNThreshold
    let avaxReceiveUlnConfirmations

    // This is the OApp config that we want to use against our contracts

    beforeEach(async () => {
        await deployOAppFixture()
        await setupDefaultEndpoint()

        const contractFactory = createConnectedContractFactory()
        ethExecutorPoint = omniContractToPoint(await contractFactory(ethExecutor))
        avaxExecutorPoint = omniContractToPoint(await contractFactory(avaxExecutor))
        ethDvnPoint = omniContractToPoint(await contractFactory(ethDvn))
        avaxDvnPoint = omniContractToPoint(await contractFactory(avaxDvn))

        ethSendUlnPoint2 = omniContractToPoint(await contractFactory(ethSendUln2_Opt2))
        avaxSendUlnPoint2 = omniContractToPoint(await contractFactory(avaxSendUln2_Opt2))
        ethReceiveUlnPoint2 = omniContractToPoint(await contractFactory(ethReceiveUln2_Opt2))
        avaxReceiveUlnPoint2 = omniContractToPoint(await contractFactory(avaxReceiveUln2_Opt2))

        ethExecutorMaxMessageSize = 100
        ethReceiveLibraryGracePeriod = 0
        ethReceiveLibraryTimeoutExpiry = 0
        ethSendUlnConfirmations = 42
        ethUlnRequiredDVNCount = 1
        ethUlnOptionalDVNCount = 1
        ethUlnOptionalDVNThreshold = 0
        ethReceiveUlnConfirmations = 24

        avaxExecutorMaxMessageSize = 999
        avaxReceiveLibraryGracePeriod = 0
        avaxReceiveLibraryTimeoutExpiry = 0
        avaxSendUlnConfirmations = 69
        avaxUlnRequiredDVNCount = 1
        avaxUlnOptionalDVNCount = 1
        avaxUlnOptionalDVNThreshold = 0
        avaxReceiveUlnConfirmations = 96

        config.contracts = [
            {
                contract: ethContract,
            },
            {
                contract: avaxContract,
            },
        ]

        config.connections = [
            {
                from: ethContract,
                to: avaxContract,
                config: {
                    sendLibrary: ethSendUlnPoint2.address,
                    receiveLibraryConfig: {
                        receiveLibrary: ethReceiveUlnPoint2.address,
                        gracePeriod: ethReceiveLibraryGracePeriod,
                    },
                    receiveLibraryTimeoutConfig: {
                        lib: ethReceiveUlnPoint2.address,
                        expiry: ethReceiveLibraryTimeoutExpiry,
                    },
                    sendConfig: {
                        executorConfig: {
                            maxMessageSize: ethExecutorMaxMessageSize,
                            executor: avaxExecutorPoint.address,
                        },
                        ulnConfig: {
                            confirmations: ethSendUlnConfirmations,
                            optionalDVNThreshold: ethUlnOptionalDVNThreshold,
                            requiredDVNCount: ethUlnRequiredDVNCount,
                            optionalDVNCount: ethUlnOptionalDVNCount,
                            requiredDVNs: [avaxDvnPoint.address],
                            optionalDVNs: [avaxDvnPoint.address],
                        },
                    },
                    receiveConfig: {
                        ulnConfig: {
                            confirmations: ethReceiveUlnConfirmations,
                            optionalDVNThreshold: ethUlnOptionalDVNThreshold,
                            requiredDVNCount: ethUlnRequiredDVNCount,
                            optionalDVNCount: ethUlnRequiredDVNCount,
                            requiredDVNs: [ethDvnPoint.address],
                            optionalDVNs: [ethDvnPoint.address],
                        },
                    },
                },
            },
            {
                from: avaxContract,
                to: ethContract,
                config: {
                    sendLibrary: avaxSendUlnPoint2.address,
                    receiveLibraryConfig: {
                        receiveLibrary: avaxReceiveUlnPoint2.address,
                        gracePeriod: avaxReceiveLibraryGracePeriod,
                    },
                    receiveLibraryTimeoutConfig: {
                        lib: avaxReceiveUlnPoint2.address,
                        expiry: avaxReceiveLibraryTimeoutExpiry,
                    },
                    sendConfig: {
                        executorConfig: {
                            maxMessageSize: avaxExecutorMaxMessageSize,
                            executor: ethExecutorPoint.address,
                        },
                        ulnConfig: {
                            confirmations: avaxSendUlnConfirmations,
                            optionalDVNThreshold: avaxUlnOptionalDVNThreshold,
                            requiredDVNCount: avaxUlnRequiredDVNCount,
                            optionalDVNCount: avaxUlnOptionalDVNCount,
                            requiredDVNs: [ethDvnPoint.address],
                            optionalDVNs: [ethDvnPoint.address],
                        },
                    },
                    receiveConfig: {
                        ulnConfig: {
                            confirmations: avaxReceiveUlnConfirmations,
                            optionalDVNThreshold: avaxUlnOptionalDVNThreshold,
                            requiredDVNCount: avaxUlnRequiredDVNCount,
                            optionalDVNCount: avaxUlnOptionalDVNCount,
                            requiredDVNs: [avaxDvnPoint.address],
                            optionalDVNs: [avaxDvnPoint.address],
                        },
                    },
                },
            },
        ]
    })

    it('should return all setPeer transactions', async () => {
        // This is the required tooling we need to set up
        const contractFactory = createConnectedContractFactory()
        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const sdkFactory = createOAppFactory(contractFactory)

        // And finally the test assertions
        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethOAppSdk = await sdkFactory(ethPoint)
        const ethEndpointSdk = await ethOAppSdk.getEndpointSDK()

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxOAppSdk = await sdkFactory(avaxPoint)
        const avaxEndpointSdk = await avaxOAppSdk.getEndpointSDK()

        const newTx: OmniTransaction[] = []
        newTx.push(
            await ethEndpointSdk.setExecutorConfig(ethSendUlnPoint2.address, [
                {
                    eid: avaxPoint.eid,
                    executorConfig: { maxMessageSize: ethExecutorMaxMessageSize, executor: avaxExecutorPoint.address },
                },
            ]),
            await ethEndpointSdk.setUlnConfig(ethSendUlnPoint2.address, [
                {
                    eid: avaxPoint.eid,
                    ulnConfig: {
                        confirmations: ethSendUlnConfirmations,
                        optionalDVNThreshold: ethUlnOptionalDVNThreshold,
                        requiredDVNs: [avaxDvnPoint.address],
                        optionalDVNs: [avaxDvnPoint.address],
                        requiredDVNCount: ethUlnRequiredDVNCount,
                        optionalDVNCount: ethUlnOptionalDVNCount,
                    },
                },
            ]),
            await ethEndpointSdk.setUlnConfig(ethReceiveUlnPoint2.address, [
                {
                    eid: avaxPoint.eid,
                    ulnConfig: {
                        confirmations: ethReceiveUlnConfirmations,
                        optionalDVNThreshold: ethUlnOptionalDVNThreshold,
                        requiredDVNs: [ethDvnPoint.address],
                        optionalDVNs: [ethDvnPoint.address],
                        requiredDVNCount: ethUlnRequiredDVNCount,
                        optionalDVNCount: ethUlnOptionalDVNCount,
                    },
                },
            ]),
            await avaxEndpointSdk.setExecutorConfig(avaxSendUlnPoint2.address, [
                {
                    eid: ethPoint.eid,
                    executorConfig: { maxMessageSize: avaxExecutorMaxMessageSize, executor: ethExecutorPoint.address },
                },
            ]),
            await avaxEndpointSdk.setUlnConfig(avaxSendUlnPoint2.address, [
                {
                    eid: ethPoint.eid,
                    ulnConfig: {
                        confirmations: avaxSendUlnConfirmations,
                        optionalDVNThreshold: avaxUlnOptionalDVNThreshold,
                        requiredDVNs: [ethDvnPoint.address],
                        optionalDVNs: [ethDvnPoint.address],
                        requiredDVNCount: avaxUlnRequiredDVNCount,
                        optionalDVNCount: avaxUlnOptionalDVNCount,
                    },
                },
            ]),
            await avaxEndpointSdk.setUlnConfig(ethReceiveUlnPoint2.address, [
                {
                    eid: ethPoint.eid,
                    ulnConfig: {
                        confirmations: avaxReceiveUlnConfirmations,
                        optionalDVNThreshold: avaxUlnOptionalDVNThreshold,
                        requiredDVNs: [avaxDvnPoint.address],
                        optionalDVNs: [avaxDvnPoint.address],
                        requiredDVNCount: avaxUlnRequiredDVNCount,
                        optionalDVNCount: avaxUlnOptionalDVNCount,
                    },
                },
            ])
        )

        const signerFactory = createSignerFactory()
        // register new Send and Receive ULNs on ETH
        const ethSigner = await signerFactory(ethContract.eid)
        await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethSendUlnPoint2.address))
        await ethSigner.signAndSend(await ethEndpointSdk.registerLibrary(ethReceiveUlnPoint2.address))

        let omniTx = await ethEndpointSdk.setSendLibrary(avaxPoint.eid, ethSendUlnPoint2.address)
        await ethSigner.signAndSend(await ethOAppSdk.callEndpoint(omniTx.data))

        omniTx = await ethEndpointSdk.setReceiveLibrary(avaxPoint.eid, ethReceiveUlnPoint2.address, 0)
        await ethSigner.signAndSend(await ethOAppSdk.callEndpoint(omniTx.data))

        // register new Send and Receive ULNs AVAX
        const avaxSigner = await signerFactory(avaxContract.eid)
        await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxSendUlnPoint2.address))
        await avaxSigner.signAndSend(await avaxEndpointSdk.registerLibrary(avaxReceiveUlnPoint2.address))

        omniTx = await avaxEndpointSdk.setSendLibrary(ethPoint.eid, avaxSendUlnPoint2.address)
        await avaxSigner.signAndSend(await avaxOAppSdk.callEndpoint(omniTx.data))

        omniTx = await avaxEndpointSdk.setReceiveLibrary(ethPoint.eid, avaxReceiveUlnPoint2.address, 0)
        await avaxSigner.signAndSend(await avaxOAppSdk.callEndpoint(omniTx.data))

        // This is where the configuration happens
        const transactions = await configureOApp(builder.graph, sdkFactory)

        const expectedTx = [
            await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
            await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            await ethEndpointSdk.setReceiveLibraryTimeout(avaxPoint.eid, ethReceiveUlnPoint2.address, 0),
            await avaxEndpointSdk.setReceiveLibraryTimeout(ethPoint.eid, avaxReceiveUlnPoint2.address, 0),
            ...newTx,
        ]
        expect(transactions).toEqual(expectedTx)
    })

    it.skip('should exclude setPeer transactions for peers that have been set', async () => {
        // This is the required tooling we need to set up
        const contractFactory = createConnectedContractFactory()
        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const sdkFactory = createOAppFactory(contractFactory)

        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethSdk = await sdkFactory(ethPoint)

        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))

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

        // TODO uncomment
        // And expect the setPeer on the eth contact not to be there
        // expect(transactions).toEqual([await avaxSdk.setPeer(ethPoint.eid, ethPoint.address)])
        console.log({ transactions })
        console.log(transactions.length)
        expect(transactions.length).toEqual(9)
    })
})
