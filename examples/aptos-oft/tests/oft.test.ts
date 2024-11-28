import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { encodeAddress } from '../sdk/utils'
<<<<<<< HEAD
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { createUlnConfig } from '../tasks/utils/ulnConfigBuilder'
import { Uln302UlnUserConfig } from '@layerzerolabs/toolbox-hardhat'
=======
import { Options } from '@layerzerolabs/lz-v2-utilities-v3'
>>>>>>> 4b8cbba17ed23395f62371014706553e9d0cf6d8

const account_address = '0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a'
const OFT_ADDRESS = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
const BSC_OFT_ADAPTER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const public_key = '0x8cea84a194ce8032cdd6e12dd87735b4f03a5ba428f3c4265813c7a39ec984d8'
const private_key = '0xc4a953452fb957eddc47e309b5679c020e09c4d3c872bda43569cbff6671dca6'
const SIMPLE_MSG_LIB = '0x3f2714ef2d63f1128f45e4a3d31b354c1c940ccdb38aca697c9797ef95e7a09f'
describe('ofts-tests', () => {
    let aptos: Aptos
    let oft: OFT

    beforeEach(async () => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
            faucet: 'http://127.0.0.1:8081',
        })
        aptos = new Aptos(config)
        oft = new OFT(aptos, OFT_ADDRESS, account_address, private_key)
    })

    describe('Delegate Management', () => {
        it('should set and reset delegate address correctly', async () => {
            await oft.setDelegate('0x0')

            const delegate = await oft.getDelegate()

            expect(delegate).toEqual(['0x0'])

            // reseting to account address so that other tests can run
            await oft.setDelegate(account_address)

            const delegate2 = await oft.getDelegate()

            expect(delegate2).toEqual([account_address])
        })
    })

    describe('Peer Management', () => {
        it('should set peer address for BSC testnet and verify encoding', async () => {
            await oft.setPeer(EndpointId.BSC_TESTNET, BSC_OFT_ADAPTER_ADDRESS)

            const peer = await oft.getPeer(EndpointId.BSC_TESTNET)

            // Convert bytes array to hex string
            const peerHexString = '0x' + Buffer.from(encodeAddress(BSC_OFT_ADAPTER_ADDRESS)).toString('hex')
            expect(peer).toEqual([peerHexString])
        })
    })

    describe('Enforced Options', () => {
        it('should set and verify executor receive options for BSC testnet', async () => {
            const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toBytes()

            await oft.setEnforcedOptions(EndpointId.BSC_TESTNET, 1, options)

            const enforcedOptions = await oft.getEnforcedOptions(EndpointId.BSC_TESTNET, 1)
            const expectedOptionsHex = '0x' + Buffer.from(options).toString('hex')
            expect(enforcedOptions).toEqual([expectedOptionsHex])
        })
    })

    // TODO if number of confirmations is == 0 then use the default confirmations
    // if lengths are zero use defaults
    describe('ULN Configuration', () => {
        it('should configure ULN with all options specified', async () => {
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                requiredDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNThreshold: 1,
            }
            const serializableUlnConfig = createUlnConfig(ulnConfig)

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
            // TODO: Look into move code and ensure that it is ok to not have any required DVNs
            const ulnConfig = {
                confirmations: 5 as unknown as bigint,
                requiredDVNs: [],
                optionalDVNs: ['0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22'],
                optionalDVNThreshold: 1,
            }
            const serializableUlnConfig = createUlnConfig(ulnConfig)

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

            const serializableUlnConfig = createUlnConfig(ulnConfig)

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

            const serializableUlnConfig = createUlnConfig(ulnConfig)

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

            const serializableUlnConfig = createUlnConfig(ulnConfig)

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

            const serializableUlnConfig = createUlnConfig(ulnConfig)

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

            expect(() => createUlnConfig(ulnConfig as Uln302UlnUserConfig)).toThrow()
        })
    })

    describe('Minting', () => {
        it('should mint tokens to the sender', async () => {
            await oft.mint(1000000000000000000)
        })
    })

    describe('Library Management', () => {
        it('should successfully set send library for BSC sandbox', async () => {
            await expect(oft.setSendLibrary(EndpointId.BSC_V2_SANDBOX, SIMPLE_MSG_LIB)).resolves.not.toThrow()
        })

        it('should successfully set receive library with version for BSC sandbox', async () => {
            await oft.setReceiveLibrary(EndpointId.BSC_V2_SANDBOX, SIMPLE_MSG_LIB, 0)
        })

        it('should set receive library timeout duration for BSC sandbox', async () => {
            await oft.setReceiveLibraryTimeout(EndpointId.BSC_V2_SANDBOX, SIMPLE_MSG_LIB, 1000000)
        })
    })
})
