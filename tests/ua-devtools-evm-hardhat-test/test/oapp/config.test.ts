import 'hardhat'
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
import {
    createConnectedContractFactory,
    createSignerFactory,
    type OmniGraphHardhat,
    OmniPointHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { configureOApp, OAppEdgeConfig, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'

describe('oapp/config', () => {
    const ethPointHardhat = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'DefaultOApp' }
    const avaxPointHardhat = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'DefaultOApp' }

    const contractFactory = createConnectedContractFactory()
    const oappSdkFactory = createOAppFactory(contractFactory)

    // const ethContract = await contractFactory(ethPointHardhat)
    // const avaxContract = await contractFactory(avaxPointHardhat)

    // This is the OApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployOAppFixture()
        await setupDefaultEndpoint()
    })

    describe('configureOApp', () => {
        it('should return an empty array with an empty config', async () => {
            const graph: OAppOmniGraph = {
                contracts: [],
                connections: [],
            }
            const contractFactory = createConnectedContractFactory()
            const sdkFactory = createOAppFactory(contractFactory)

            // Now we configure the OApp
            const transactions = await configureOApp(graph, sdkFactory)

            expect(transactions).toEqual([])
        })
    })

    describe('configureOAppPeers', () => {
        it('should return all setPeer transactions', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: ethPoint,
                    },
                    {
                        point: avaxPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethPoint, to: avaxPoint },
                        config: undefined,
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: undefined,
                    },
                ],
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ])
        })

        it('should exclude setPeer transactions for peers that have been set', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: ethPoint,
                    },
                    {
                        point: avaxPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethPoint, to: avaxPoint },
                        config: undefined,
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: undefined,
                    },
                ],
            }

            // Before we configure the OApp, we'll set some peers
            {
                const signerFactory = createSignerFactory()
                const ethSigner = await signerFactory(ethContract.eid)
                const ethTransaction = await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address)
                const ethResponse = await ethSigner.signAndSend(ethTransaction)
                const ethReceipt = await ethResponse.wait()
                expect(ethReceipt.from).toBe(await ethSigner.signer.getAddress())
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)

            // And expect the setPeer on the eth contact not to be there
            expect(transactions).toEqual([await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address)])
        })
    })

    describe('configureEnforcedOptions', () => {
        it('should return only setPeer transaction when enforcedOptions is empty', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: ethPoint,
                    },
                    {
                        point: avaxPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethPoint, to: avaxPoint },
                        config: {
                            enforcedOptions: [],
                        },
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: {
                            enforcedOptions: [],
                        },
                    },
                ],
            }

            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)

            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
            ])
        })

        it('should return setPeer and setEnforcedOptions transaction when enforcedOptions are set', async () => {
            const ethContract = await contractFactory(ethPointHardhat)
            const avaxContract = await contractFactory(avaxPointHardhat)

            const ethPoint = omniContractToPoint(ethContract)
            const ethOAppSdk = await oappSdkFactory(ethPoint)

            const avaxPoint = omniContractToPoint(avaxContract)
            const avaxOAppSdk = await oappSdkFactory(avaxPoint)

            // This is the OApp config that we want to use against our contracts
            const graph: OAppOmniGraph = {
                contracts: [
                    {
                        point: ethPoint,
                    },
                    {
                        point: avaxPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethPoint, to: avaxPoint },
                        config: {
                            enforcedOptions: [
                                {
                                    msgType: 1,
                                    options: '0x00030100110100000000000000000000000000030d40',
                                },
                            ],
                        },
                    },
                    {
                        vector: { from: avaxPoint, to: ethPoint },
                        config: {
                            enforcedOptions: [
                                {
                                    msgType: 1,
                                    gas: '200000',
                                    value: '0',
                                },
                            ],
                        },
                    },
                ],
            }
            // Now we configure the OApp
            const transactions = await configureOApp(graph, oappSdkFactory)
            expect(transactions).toEqual([
                await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address),
                await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address),
                await ethOAppSdk.setEnforcedOptions([
                    {
                        eid: avaxPoint.eid,
                        msgType: 1,
                        options: '0x00030100110100000000000000000000000000030d40',
                    },
                ]),
                await avaxOAppSdk.setEnforcedOptions([
                    {
                        eid: ethPoint.eid,
                        msgType: 1,
                        options: '0x00030100110100000000000000000000000000030d40',
                    },
                ]),
            ])
        })
    })
})

// TODO need to refactor these but dont want to break options.test.ts
export const getDefaultAvaxConfig = async (): Promise<OAppTestConfig> => {
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

export const getDefaultEthConfig = async (): Promise<OAppTestConfig> => {
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

export type OAppTestConfig = {
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

export const setUpConfig = async (testConfig: OAppTestConfig): Promise<OAppEdgeConfig> => {
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

export const setUpOmniGraphHardhat = (
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

const getLibraryAddress = async (library: OmniPointHardhat): Promise<string> => {
    const contractFactory = createConnectedContractFactory()
    const executorPoint = omniContractToPoint(await contractFactory(library))
    return executorPoint.address
}
