import { HardhatContext } from 'hardhat/internal/context'
import { TasksDSL } from 'hardhat/internal/core/tasks/dsl'
import { loadConfigAndTasks } from 'hardhat/internal/core/config/config-loading'
import { createSerializableUlnConfig } from '../tasks/utils/ulnConfigBuilder'

// Initialize global task variable that plugins expect
;(global as any).task = new TasksDSL()

// Create Hardhat context
HardhatContext.createHardhatContext()

// Load config and tasks
loadConfigAndTasks()

// Now import everything else
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { getConfigConnections } from '../tasks/utils/utils'
import {
    setEnforcedOptions,
    setExecutorConfig,
    setPeers,
    setReceiveConfig,
    setReceiveLibrary,
    setReceiveLibraryTimeout,
    setSendConfig,
    setSendLibrary,
} from '../tasks/utils/aptosOftConfigOps'
import type { OAppOmniGraphHardhat, OmniPointHardhat, Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'
import '../hardhat.config'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'
import { Endpoint } from '../sdk/endpoint'

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

const mockConnections: OAppOmniGraphHardhat['connections'] = [
    {
        from: mockFrom,
        to: mockTo,
    },
]

describe('config-ops-tests', () => {
    let aptos: Aptos
    let oft: OFT
    let endpoint: Endpoint
    let connections: OAppOmniGraphHardhat['connections']

    beforeEach(async () => {
        const config = new AptosConfig({
            network: Network.TESTNET,
        })
        aptos = new Aptos(config)
        oft = new OFT(aptos, OFT_ADDRESS, ACCOUNT_ADDRESS, PRIVATE_KEY)
        endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)
        connections = getConfigConnections('from', EndpointId.APTOS_V2_TESTNET)
    })

    describe('setPeers', () => {
        it('should not return any txs if peers are already set', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await setPeers(oft, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(0)
        })

        it('should set peers for all connections', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await setPeers(oft, mockConnections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(1)
        })
    })

    describe('setEnforcedOptions', () => {
        it('should return no txs if no options are set', async () => {
            const txs = await setEnforcedOptions(oft, mockConnections)

            expect(txs.length).toBe(0)
        })
        it('should set return one enforced options tx for BSC testnet', async () => {
            connections[0].config.enforcedOptions[0] = {
                msgType: 1,
                optionType: ExecutorOptionType.LZ_RECEIVE,
                gas: 100420,
                value: 0,
            }

            const txs = await setEnforcedOptions(oft, connections)
            console.log(`txs:`)
            console.dir(txs, { depth: null })
            expect(txs.length).toBe(1)
        })
        it('should have enforced options set for all message types due to previous wire run', async () => {
            const currentOptionsHexType1 = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 1)
            console.log(`Message type 1 options: ${currentOptionsHexType1}`)

            const currentOptionsHexType2 = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 2)
            console.log(`Message type 2 options: ${currentOptionsHexType2}`)

            expect(currentOptionsHexType1).not.toBe('0x')
            expect(currentOptionsHexType2).not.toBe('0x')
        })
    })

    describe('setSendLibrary', () => {
        it('should set send library', async () => {
            connections[0].config.sendLibrary = '0xb33f'
            const txs = await setSendLibrary(oft, endpoint, connections)
            expect(txs.length).toBe(1)
        })
    })

    describe('setReceiveLibrary', () => {
        it('should set receive library', async () => {
            connections[0].config.receiveLibraryConfig.receiveLibrary = '0xb33f'
            const txs = await setReceiveLibrary(oft, endpoint, connections)
            expect(txs.length).toBe(1)
        })
    })

    describe('setReceiveLibraryTimeout', () => {
        it('should set receive library timeout', async () => {
            connections[0].config.receiveLibraryTimeoutConfig.expiry = BigInt(2)
            const txs = await setReceiveLibraryTimeout(oft, endpoint, connections)
            expect(txs.length).toBe(1)
        })
    })

    describe('setSendConfig', () => {
        it('should return 0 txs when no change is made', async () => {
            const txs = await setSendConfig(oft, endpoint, connections)
            expect(txs.length).toBe(0)
        })
        it('should return 1 tx when change is made', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }
            connections[0].config.sendConfig.ulnConfig.confirmations = 42n
            const txs = await setSendConfig(oft, endpoint, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(1)
        })
    })

    describe('setReceiveConfig', () => {
        it('should return 0 txs when no change is made', async () => {
            const txs = await setReceiveConfig(oft, endpoint, connections)
            expect(txs.length).toBe(0)
        })
        it('should return 1 tx when change is made', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }
            connections[0].config.receiveConfig.ulnConfig.confirmations = 42n
            const txs = await setReceiveConfig(oft, endpoint, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(1)
        })
    })

    describe('setExecutorConfig', () => {
        it('should return 0 txs when no change is made', async () => {
            const txs = await setExecutorConfig(oft, endpoint, connections)
            expect(txs.length).toBe(0)
        })
        it('should return 1 tx when change is made', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await setExecutorConfig(oft, endpoint, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(0)
        })
        it('should set executor config', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }
            connections[0].config.sendConfig.executorConfig.maxMessageSize = 42069
            const txs = await setExecutorConfig(oft, endpoint, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(1)
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

            expect(serializableUlnConfig).toEqual({
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

            expect(serializableUlnConfig).toEqual({
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

            expect(serializableUlnConfig).toEqual({
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

            expect(() => createSerializableUlnConfig(ulnConfig as Uln302UlnUserConfig, mockTo, mockFrom)).toThrow()
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

            expect(serializableUlnConfig).toEqual({
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

            expect(() => createSerializableUlnConfig(ulnConfig as Uln302UlnUserConfig, mockTo, mockFrom)).toThrow()
        })
    })
})
