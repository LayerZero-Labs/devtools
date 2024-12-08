import { HardhatContext } from 'hardhat/internal/context'
import { TasksDSL } from 'hardhat/internal/core/tasks/dsl'
import { loadConfigAndTasks } from 'hardhat/internal/core/config/config-loading'

// Initialize global task variable that plugins expect
;(global as any).task = new TasksDSL()

// Create Hardhat context
HardhatContext.createHardhatContext()

// Load config and tasks
loadConfigAndTasks()
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { Options } from '@layerzerolabs/lz-v2-utilities-v3'
import { createSerializableUlnConfig } from '../tasks/utils/ulnConfigBuilder'
import { Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'
import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'
import { getLzNetworkStage, parseYaml } from '../tasks/utils/aptosNetworkParser'
import { getAptosOftAddress } from '../tasks/utils/utils'

const BSC_OFT_ADAPTER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const ULN_302 = '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10'

const mockTo: OmniPointHardhat = {
    contractName: 'oapp_core',
    eid: EndpointId.BSC_V2_TESTNET,
}
const mockFrom: OmniPointHardhat = {
    contractName: 'oapp_core',
    eid: EndpointId.APTOS_V2_TESTNET,
}

describe('oft-tests', () => {
    let aptos: Aptos
    let oft: OFT
    let private_key: string
    let account_address: string
    let OFT_ADDRESS: string

    beforeEach(async () => {
        const config = await parseYaml()
        console.log(`Using aptos network ${config.network}\n`)

        const aptosConfig = new AptosConfig({ network: config.network })
        const lzNetworkStage = getLzNetworkStage(config.network)
        OFT_ADDRESS = getAptosOftAddress(lzNetworkStage)

        private_key = config.private_key
        account_address = config.account_address

        aptos = new Aptos(aptosConfig)
        oft = new OFT(aptos, OFT_ADDRESS, account_address, private_key)
    })

    describe('Delegate Management', () => {
        it('should set and reset delegate address correctly', async () => {
            await oft.setDelegatePayload('0x0')

            const delegate = await oft.getDelegate()

            expect(delegate).toEqual(['0x0'])

            // reseting to account address so that other tests can run
            await oft.setDelegatePayload(account_address)

            const delegate2 = await oft.getDelegate()

            expect(delegate2).toEqual([account_address])
        })
    })

    describe('Peer Management', () => {
        it('should set peer address for BSC testnet and verify encoding', async () => {
            await oft.setPeerPayload(EndpointId.BSC_V2_TESTNET, BSC_OFT_ADAPTER_ADDRESS)

            const peer = await oft.getPeer(EndpointId.BSC_V2_TESTNET)

            // Convert bytes array to hex string
            const peerHexString = '0x' + Buffer.from(BSC_OFT_ADAPTER_ADDRESS).toString('hex')
            expect(peer).toEqual([peerHexString])
        })
    })

    describe('Enforced Options', () => {
        it('should set and verify executor receive options for BSC testnet', async () => {
            const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toBytes()

            await oft.setEnforcedOptionsPayload(EndpointId.BSC_V2_TESTNET, 1, options)
            const expectedOptionsHex = '0x' + Buffer.from(options).toString('hex')

            const enforcedOptions = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 1)
            expect(enforcedOptions).toEqual([expectedOptionsHex])
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

        it('should configure ULN with default required DVNs when empty array provided', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                requiredDVNs: [],
                optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNThreshold: 1,
            }
            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = false
            const expected_use_default_for_required_dvns = true
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
                confirmations: 5 as unknown as bigint,
                requiredDVNs: [],
                optionalDVNs: [],
                optionalDVNThreshold: 1,
            }

            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = false
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
                required_dvns: [],
                optional_dvns: ulnConfig.optionalDVNs,
                optional_dvn_threshold: ulnConfig.optionalDVNThreshold,
                use_default_for_confirmations: expected_use_default_for_confirmations,
                use_default_for_required_dvns: expected_use_default_for_required_dvns,
                use_default_for_optional_dvns: expected_use_default_for_optional_dvns,
            })
        })

        it('should configure ULN with optional DVNs and threshold omitted', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                requiredDVNs: ['0x1'],
            }

            const serializableUlnConfig = createSerializableUlnConfig(ulnConfig, mockTo, mockFrom)

            const expected_use_default_for_confirmations = true
            const expected_use_default_for_required_dvns = false
            const expected_use_default_for_optional_dvns = true

            expect(serializableUlnConfig).toEqual({
                confirmations: ulnConfig.confirmations,
                required_dvns: [],
                optional_dvns: [],
                optional_dvn_threshold: 0,
                use_default_for_confirmations: expected_use_default_for_confirmations,
                use_default_for_required_dvns: expected_use_default_for_required_dvns,
                use_default_for_optional_dvns: expected_use_default_for_optional_dvns,
            })
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
                required_dvns: [],
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

    describe('Library Management', () => {
        it('should successfully set send library for BSC sandbox', async () => {
            expect(oft.setSendLibraryPayload(EndpointId.BSC_V2_TESTNET, ULN_302)).resolves.not.toThrow()
        })

        it('should successfully set receive library with version for BSC sandbox', async () => {
            oft.setReceiveLibraryPayload(EndpointId.BSC_V2_TESTNET, ULN_302, 0)
        })

        it('should set receive library timeout duration for BSC sandbox', async () => {
            oft.setReceiveLibraryTimeoutPayload(EndpointId.BSC_V2_TESTNET, ULN_302, 1000000)
        })
    })
})
