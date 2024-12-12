import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { expect } from 'chai'

import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'

import { Endpoint } from '../../sdk/endpoint'
import { OFT } from '../../sdk/oft'
import {
    createSetEnforcedOptionsTxs,
    createSetExecutorConfigTxs,
    createSetPeerTxs,
    createSetReceiveConfigTxs,
    createSetReceiveLibraryTimeoutTxs,
    createSetReceiveLibraryTxs,
    createSetSendConfigTxs,
    createSetSendLibraryTxs,
} from '../../tasks/move/utils/aptosOftConfigOps'
import { createSerializableUlnConfig } from '../../tasks/move/utils/ulnConfigBuilder'

// Initialize global task variable that plugins expect
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// ;(global as any).task = new TasksDSL()

// Create Hardhat context
// HardhatContext.createHardhatContext()

// // Load config and tasks
// loadConfigAndTasks()

import type {
    OAppEdgeConfig,
    OmniEdgeHardhat,
    OmniPointHardhat,
    Uln302UlnUserConfig,
} from '@layerzerolabs/toolbox-hardhat'

import '../../hardhat.config'

const ACCOUNT_ADDRESS = '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'
const OFT_ADDRESS = '0xff7558ca65cb0d0ab717ced3c25fbd3a2762faf5919e06fab5176a071cb081ae'
const PRIVATE_KEY = '0xa7e55402de9020fc57c25e72e2592384e1896b32c4966ca76a573b710b94a860'
const ENDPOINT_ADDRESS = '0xa53352d6eb261173560111b83eb898611a8e87f7dabada415159f749fbd185e4'

const mockTo: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'mockOFT',
}
const mockFrom: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'oft',
}

describe('config-ops-tests', () => {
    let aptos: Aptos
    let oft: OFT
    let endpoint: Endpoint

    beforeEach(async () => {
        const config = new AptosConfig({
            network: Network.TESTNET,
        })
        aptos = new Aptos(config)
        oft = new OFT(aptos, OFT_ADDRESS, ACCOUNT_ADDRESS, PRIVATE_KEY)
        endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)
    })

    describe('setPeers', () => {
        it('should not return any txs if peers are already set', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await createSetPeerTxs(oft, mockConnections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).to.equal(0)
        })

        it.only('should return 1 tx when peer set to new address', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }
            mockConnections.push({
                from: aptosContract,
                to: ethereumContract,
                config: {},
            })
            const txs = await createSetPeerTxs(oft, mockConnections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).to.equal(1)
        })
    })

    describe('setEnforcedOptions', () => {
        it('should return no txs if no options are set', async () => {
            const txs = await createSetEnforcedOptionsTxs(oft, mockConnections)

            expect(txs.length).to.equal(0)
        })
        it('should set return one enforced options tx for BSC testnet', async () => {
            if (mockConnections[0]?.config?.enforcedOptions) {
                mockConnections[0].config.enforcedOptions[0] = {
                    msgType: 1,
                    optionType: ExecutorOptionType.LZ_RECEIVE,
                    gas: 100420,
                    value: 0,
                }
            }

            const txs = await createSetEnforcedOptionsTxs(oft, mockConnections)
            expect(txs.length).to.equal(1)
        })
        it('should have enforced options set for all message types due to previous wire run', async () => {
            const currentOptionsHexType1 = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 1)
            console.log(`Message type 1 options: ${currentOptionsHexType1}`)

            const currentOptionsHexType2 = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 2)
            console.log(`Message type 2 options: ${currentOptionsHexType2}`)

            expect(currentOptionsHexType1).not.to.equal('0x')
            expect(currentOptionsHexType2).not.to.equal('0x')
        })
    })

    describe('setSendLibrary', () => {
        it('should set send library', async () => {
            if (mockConnections[0]?.config) {
                mockConnections[0].config.sendLibrary = '0xb33f'
                const txs = await createSetSendLibraryTxs(oft, endpoint, mockConnections)
                expect(txs.length).to.equal(1)
            }
        })
    })

    describe('setReceiveLibrary', () => {
        it('should set receive library', async () => {
            if (mockConnections[0]?.config?.receiveLibraryConfig) {
                mockConnections[0].config.receiveLibraryConfig.receiveLibrary = '0xb33f'
                const txs = await createSetReceiveLibraryTxs(oft, endpoint, mockConnections)
                expect(txs.length).to.equal(1)
            }
        })
    })

    describe('setReceiveLibraryTimeout', () => {
        it('should set receive library timeout', async () => {
            if (mockConnections[0]?.config?.receiveLibraryTimeoutConfig) {
                mockConnections[0].config.receiveLibraryTimeoutConfig.expiry = BigInt(2)
                const txs = await createSetReceiveLibraryTimeoutTxs(oft, endpoint, mockConnections)
                expect(txs.length).to.equal(1)
            }
        })
    })

    describe('setSendConfig', () => {
        it('should return 0 txs when no change is made', async () => {
            const txs = await createSetSendConfigTxs(oft, endpoint, mockConnections)
            expect(txs.length).to.equal(0)
        })
        it('should return 1 tx when change is made', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }
            if (mockConnections[0]?.config?.sendConfig?.ulnConfig) {
                mockConnections[0].config.sendConfig.ulnConfig.confirmations = 42n
                const txs = await createSetSendConfigTxs(oft, endpoint, mockConnections)

                // Restore original console.log
                console.log = originalLog

                expect(txs.length).to.equal(1)
            }
        })
    })

    describe('setReceiveConfig', () => {
        it('should return 0 txs when no change is made', async () => {
            const txs = await createSetReceiveConfigTxs(oft, endpoint, mockConnections)
            expect(txs.length).to.equal(0)
        })
        it('should return 1 tx when change is made', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }
            if (mockConnections[0]?.config?.receiveConfig?.ulnConfig) {
                mockConnections[0].config.receiveConfig.ulnConfig.confirmations = 42n
                const txs = await createSetReceiveConfigTxs(oft, endpoint, mockConnections)

                // Restore original console.log
                console.log = originalLog

                expect(txs.length).to.equal(1)
            }
        })
    })

    describe('createExecutorConfigTxs', () => {
        it('should return 0 txs when no change is made', async () => {
            const txs = await createSetExecutorConfigTxs(oft, endpoint, mockConnections)
            expect(txs.length).to.equal(0)
        })
        it('should return 1 tx when change is made', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            if (mockConnections[0]?.config?.sendConfig?.executorConfig) {
                mockConnections[0].config.sendConfig.executorConfig.maxMessageSize = 42069
                const txs = await createSetExecutorConfigTxs(oft, endpoint, mockConnections)

                // Restore original console.log
                console.log = originalLog

                expect(txs.length).to.equal(1)
            }
        })
    })

    describe('ULN Configuration', () => {
        it('should configure ULN with all options specified', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                requiredDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNThreshold: 1,
            }
            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = false
            const expected_use_default_for_required_dvns = false
            const expected_use_default_for_optional_dvns = false

            expect(serializableUlnConfig).to.deep.equal({
                confirmations: ulnConfig.confirmations,
                required_dvns: ulnConfig.requiredDVNs,
                optional_dvns: ulnConfig.optionalDVNs,
                optional_dvn_threshold: ulnConfig.optionalDVNThreshold,
                use_default_for_confirmations: expected_use_default_for_confirmations,
                use_default_for_required_dvns: expected_use_default_for_required_dvns,
                use_default_for_optional_dvns: expected_use_default_for_optional_dvns,
            })
        })

        it('should configure ULN with default optional DVNs when empty array provided', async () => {
            const ulnConfig = {
                confirmations: 0n as unknown as bigint,
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 1,
            }

            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = true
            const expected_use_default_for_required_dvns = true
            const expected_use_default_for_optional_dvns = true

            expect(serializableUlnConfig).to.deep.equal({
                confirmations: ulnConfig.confirmations,
                required_dvns: ulnConfig.requiredDVNs,
                optional_dvns: ulnConfig.optionalDVNs,
                optional_dvn_threshold: ulnConfig.optionalDVNThreshold,
                use_default_for_confirmations: expected_use_default_for_confirmations,
                use_default_for_required_dvns: expected_use_default_for_required_dvns,
                use_default_for_optional_dvns: expected_use_default_for_optional_dvns,
            })
        })

        it('should ignore provided required DVNs when explicitly set to use defaults', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                optionalDVNThreshold: 1,
                requiredDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNs: [],
            }

            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = false
            const expected_use_default_for_required_dvns = false
            const expected_use_default_for_optional_dvns = true

            expect(serializableUlnConfig).to.deep.equal({
                confirmations: ulnConfig.confirmations,
                required_dvns: ulnConfig.requiredDVNs,
                optional_dvns: ulnConfig.optionalDVNs,
                optional_dvn_threshold: ulnConfig.optionalDVNThreshold,
                use_default_for_confirmations: expected_use_default_for_confirmations,
                use_default_for_required_dvns: expected_use_default_for_required_dvns,
                use_default_for_optional_dvns: expected_use_default_for_optional_dvns,
            })
        })
        it('should throw error when optional DVNs and threshold are omitted', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                requiredDVNs: ['0x1'],
            }

            expect(() => createSerializableUlnConfig(ulnConfig as Uln302UlnUserConfig, mockTo, mockFrom)).to.throw()
        })

        it('should configure ULN with only required DVNs specified', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                optionalDVNThreshold: 1,
                requiredDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNs: [],
            }

            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = false
            const expected_use_default_for_required_dvns = false
            const expected_use_default_for_optional_dvns = true

            expect(serializableUlnConfig).to.deep.equal({
                confirmations: ulnConfig.confirmations,
                required_dvns: ulnConfig.requiredDVNs,
                optional_dvns: ulnConfig.optionalDVNs,
                optional_dvn_threshold: ulnConfig.optionalDVNThreshold,
                use_default_for_confirmations: expected_use_default_for_confirmations,
                use_default_for_required_dvns: expected_use_default_for_required_dvns,
                use_default_for_optional_dvns: expected_use_default_for_optional_dvns,
            })
        })

        it('should throw error when required DVNs configuration is missing', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
            }

            expect(() => createSerializableUlnConfig(ulnConfig as Uln302UlnUserConfig, mockTo, mockFrom)).to.throw()
        })
    })
})

const bscContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_TESTNET,
    contractName: 'MyOFT',
}

const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_TESTNET,
    contractName: 'oft',
}

const ethereumContract: OmniPointHardhat = {
    eid: EndpointId.ETHEREUM_V2_TESTNET,
    contractName: 'MyOFT',
}

const mockConnections: OmniEdgeHardhat<OAppEdgeConfig>[] = [
    {
        from: aptosContract,
        to: bscContract,
        config: {
            enforcedOptions: [
                {
                    msgType: 1,
                    optionType: ExecutorOptionType.LZ_RECEIVE,
                    gas: 80000,
                    value: 0,
                },
                {
                    msgType: 2,
                    optionType: ExecutorOptionType.LZ_RECEIVE,
                    gas: 80000,
                    value: 0,
                },
            ],
            sendLibrary: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
            receiveLibraryConfig: {
                // Required Receive Library Address on Aptos
                receiveLibrary: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
                // Optional Grace Period for Switching Receive Library Address on Aptos
                gracePeriod: BigInt(0),
            },
            // Optional Receive Library Timeout for when the Old Receive Library Address will no longer be valid on Aptos
            receiveLibraryTimeoutConfig: {
                lib: '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10',
                expiry: BigInt(1000000000),
            },
            sendConfig: {
                executorConfig: {
                    maxMessageSize: 10000,
                    // The configured Executor address on Aptos
                    executor: '0xeb514e8d337485dd9ce7492f70128ef5aaa8c34023866e261a24ffa3d61a686d',
                },
                ulnConfig: {
                    // The number of block confirmations to wait on Aptos before emitting the message from the source chain.
                    confirmations: BigInt(260),
                    // The address of the DVNs you will pay to verify a sent message on the source chain.
                    // The destination tx will wait until ALL `requiredDVNs` verify the message.
                    requiredDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
                    // The address of the DVNs you will pay to verify a sent message on the source chain.
                    // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                    optionalDVNs: [],
                    // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                    optionalDVNThreshold: 0,
                },
            },
            // Optional Receive Configuration
            // @dev Controls how the `from` chain receives messages from the `to` chain.
            receiveConfig: {
                ulnConfig: {
                    // The number of block confirmations to expect from the `to` chain.
                    confirmations: BigInt(5),
                    // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain.
                    // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
                    requiredDVNs: ['0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd'],
                    // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain.
                    // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
                    optionalDVNs: [],
                    // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                    optionalDVNThreshold: 0,
                },
            },
        },
    },
]
