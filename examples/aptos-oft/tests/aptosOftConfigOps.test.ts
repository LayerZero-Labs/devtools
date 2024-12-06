import { HardhatContext } from 'hardhat/internal/context'
import { TasksDSL } from 'hardhat/internal/core/tasks/dsl'
import { loadConfigAndTasks } from 'hardhat/internal/core/config/config-loading'
import { UlnConfig } from '../tasks/utils'

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
import { diffPrinter, getConfigConnections } from '../tasks/utils/utils'
import {
    setEnforcedOptions,
    setExecutorConfig,
    setPeers,
    setReceiveConfig,
    setReceiveLibrary,
    setSendConfig,
    setSendLibrary,
} from '../tasks/utils/aptosOftConfigOps'
import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'
import '../hardhat.config'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities-v3'
import { Endpoint } from '../sdk/endpoint'
const account_address = '0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a'
const OFT_ADDRESS = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
const private_key = '0xc4a953452fb957eddc47e309b5679c020e09c4d3c872bda43569cbff6671dca6'

// Initialize Hardhat context

const ENDPOINT_ADDRESS = '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c'

const mockContract: OmniPointHardhat = {
    eid: EndpointId.BSC_V2_SANDBOX,
    contractName: 'mockOFT',
}
const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_V2_SANDBOX,
    contractName: 'oft',
}

const mockConnections: OAppOmniGraphHardhat['connections'] = [
    {
        from: aptosContract,
        to: mockContract,
    },
]

describe('config-ops-tests', () => {
    let aptos: Aptos
    let oft: OFT
    let endpoint: Endpoint
    let connections: OAppOmniGraphHardhat['connections']

    beforeEach(async () => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
            faucet: 'http://127.0.0.1:8081',
        })
        aptos = new Aptos(config)
        oft = new OFT(aptos, OFT_ADDRESS, account_address, private_key)
        endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)
        connections = getConfigConnections('from', EndpointId.APTOS_V2_SANDBOX)
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
        it('should set enforced options for BSC testnet', async () => {
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
        it('should have enforced options set for all message types', async () => {
            // Test message types 0-3

            const currentOptionsHexType1 = await oft.getEnforcedOptions(EndpointId.BSC_V2_SANDBOX, 1)
            console.log(`Message type 1 options: ${currentOptionsHexType1}`)

            const currentOptionsHexType2 = await oft.getEnforcedOptions(EndpointId.BSC_V2_SANDBOX, 2)
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

    // describe('setReceiveLibraryTimeout', () => {
    //     it('should set receive library timeout', async () => {
    //         connections[0].config.receiveLibraryTimeoutConfig.expiry = BigInt(2)
    //         const txs = await setReceiveLibraryTimeout(oft, endpoint, connections)
    //         expect(txs.length).toBe(1)
    //     })
    // })

    describe('setSendConfig', () => {
        it('should set send config', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await setSendConfig(oft, endpoint, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(0)
        })
        it('should set send config', async () => {
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
        it('should set receive config', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await setReceiveConfig(oft, endpoint, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(0)
        })
        it('should set receive config', async () => {
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

    describe('ulnConfigSerdes', () => {
        it('should serialize and deserialize uln config', () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            // Create config with regular number instead of BigInt
            const config = {
                confirmations: 5n,
                optional_dvn_threshold: 1,
                required_dvns: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optional_dvns: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                use_default_for_confirmations: false,
                use_default_for_required_dvns: false,
                use_default_for_optional_dvns: false,
            }
            const serializedUlnConfig = UlnConfig.serialize(EndpointId.APTOS_V2_SANDBOX, config as UlnConfig)
            const deserializedUlnConfig = UlnConfig.deserialize(serializedUlnConfig)

            // Test each field separately, converting BigInts to strings for comparison
            const expectedConfig = {
                ...config,
                confirmations: config.confirmations.toString(),
            }

            const actualConfig = {
                ...deserializedUlnConfig,
                confirmations: deserializedUlnConfig.confirmations.toString(),
            }
            diffPrinter('test', expectedConfig, actualConfig)

            console.log = originalLog
            // Restore original console.log

            // Compare non-BigInt fields
            expect(actualConfig.optional_dvn_threshold).toEqual(expectedConfig.optional_dvn_threshold)
            expect(actualConfig.required_dvns).toEqual(expectedConfig.required_dvns)
            expect(actualConfig.optional_dvns).toEqual(expectedConfig.optional_dvns)
            expect(actualConfig.use_default_for_confirmations).toEqual(expectedConfig.use_default_for_confirmations)
            expect(actualConfig.use_default_for_required_dvns).toEqual(expectedConfig.use_default_for_required_dvns)
            expect(actualConfig.use_default_for_optional_dvns).toEqual(expectedConfig.use_default_for_optional_dvns)

            // Compare BigInt field separately as strings
            expect(actualConfig.confirmations).toEqual(expectedConfig.confirmations)
        })
    })

    describe('setExecutorConfig', () => {
        it.only('should set executor config', async () => {
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
        it.only('should set executor config', async () => {
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
})
