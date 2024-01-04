import { makeBytes32, OmniSignerEVM, parseLogsWithName } from '@layerzerolabs/devtools-evm'
import { parseEther } from 'ethers/lib/utils'
import fc from 'fast-check'
import 'hardhat'
import { TransactionReceipt } from '@ethersproject/providers'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-utility-v2'
import { IncrementType } from '@layerzerolabs/omnicounter-devtools'
import { createOmniCounterFactory, OmniCounter } from '@layerzerolabs/omnicounter-devtools-evm'
import { createEndpointFactory } from '@layerzerolabs/protocol-devtools-evm'
import { configureOAppPeers, OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { createSignAndSend, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import {
    createConnectedContractFactory,
    createSignerFactory,
    OmniContractFactoryHardhat,
    OmniGraphBuilderHardhat,
    OmniGraphHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import { setupDefaultEndpoint } from '../__utils__/endpoint'
import { deployOmniCounterFixture } from '../__utils__/omnicounter'
import {
    getDefaultAvaxConfig,
    getDefaultEthConfig,
    OAppTestConfig,
    setUpConfig,
    setUpOmniGraphHardhat,
} from '../oapp/config.test'

/**
 * The maximum value of an uint16.
 */
const MAX_UINT_16: number = 0xffff

/**
 * The maximum value of an uint128.
 */
const MAX_UINT_128: bigint = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')

/**
 * The minimum native drop measured in native gas unit.
 */
const DEFAULT_MIN_NATIVE_DROP: bigint = BigInt(0)

/**
 * The maximum native drop measured in native gas unit (currently configured in 001_bootstap.ts).
 */
const DEFAULT_MAX_NATIVE_DROP: bigint = parseEther('0.25').toBigInt()

/**
 * The minimum gasLimit for an Option.
 */
const MIN_GAS_LIMIT = BigInt(0)

/**
 * The maximum gasLimit for an Option.
 */
const MAX_GAS_LIMIT = MAX_UINT_128

/**
 * The minimum index for a Composed Option.
 */
const MIN_INDEX: number = 0

/**
 * The maximum index for a Composed Option.
 */
const MAX_INDEX: number = MAX_UINT_16

/**
 * An OmniCounter User Application specific arbitrary using the different types of "increment".
 */
const OMNICOUNTER_INCREMENT_TYPE_ARBITRARY: fc.Arbitrary<IncrementType> = fc.oneof(
    fc.constant(IncrementType.VANILLA_TYPE),
    fc.constant(IncrementType.COMPOSED_TYPE),
    fc.constant(IncrementType.ABA_TYPE),
    fc.constant(IncrementType.COMPOSED_ABA_TYPE)
)

/**
 * An arbitrary for gasLimit.
 */
const GAS_LIMIT_ARBITRARY: fc.Arbitrary<bigint> = fc.bigInt({ min: MIN_GAS_LIMIT, max: MAX_GAS_LIMIT })

/**
 * An arbitrary for value (native drop).
 */
const NATIVE_DROP_ARBITRARY: fc.Arbitrary<bigint> = fc.bigInt({
    min: DEFAULT_MIN_NATIVE_DROP,
    max: DEFAULT_MAX_NATIVE_DROP,
})

/**
 * An arbitrary for Composed Option index.
 */
const INDEX_ARBITRARY: fc.Arbitrary<number> = fc.integer({ min: MIN_INDEX, max: MAX_INDEX })

/**
 * Helper used to apply a 10% premium to input.
 * @param {bigint} input
 */
const applyPremium = (input: bigint) => (BigInt(input) * BigInt(110)) / BigInt(100)

/**
 * Test the OApp options using the OmniCounter OApp as the test contract.
 */
describe('oapp/options', () => {
    const ethOmniCounter = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'OmniCounter' }
    const avaxOmniCounter = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'OmniCounter' }
    const ethEndpoint = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'EndpointV2' }

    let ethSdk: OmniCounter
    let ethSigner: OmniSignerEVM
    let avaxPoint: OmniPoint
    let contractFactory: OmniContractFactoryHardhat

    beforeEach(async () => {
        await deployOmniCounterFixture()
        await setupDefaultEndpoint()
        contractFactory = createConnectedContractFactory()
        const sdkFactory = createOmniCounterFactory(contractFactory)
        const signerFactory = createSignerFactory()

        const ethPoint = omniContractToPoint(await contractFactory(ethOmniCounter))
        const ethTestConfig: OAppTestConfig = await getDefaultEthConfig()
        const ethOAppConfig: OAppEdgeConfig = await setUpConfig(ethTestConfig)
        ethSdk = await sdkFactory(ethPoint)
        ethSigner = await signerFactory(ethOmniCounter.eid)

        avaxPoint = omniContractToPoint(await contractFactory(avaxOmniCounter))
        const avaxTestConfig: OAppTestConfig = await getDefaultAvaxConfig()
        const avaxOAppConfig: OAppEdgeConfig = await setUpConfig(avaxTestConfig)
        const avaxSdk = await sdkFactory(avaxPoint)

        const config: OmniGraphHardhat<unknown, OAppEdgeConfig> = setUpOmniGraphHardhat(
            ethOmniCounter,
            ethOAppConfig,
            avaxOmniCounter,
            avaxOAppConfig
        )

        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const transactions = await configureOAppPeers(builder.graph, sdkFactory)
        const signAndSend = createSignAndSend(createSignerFactory())
        const [transactionReceipts, errors] = await signAndSend(transactions)
        expect(transactionReceipts).toBeDefined()
        expect(errors).toHaveLength(0)

        expect(await ethSdk.hasPeer(avaxPoint.eid, avaxPoint.address)).toBe(true)
        expect(await avaxSdk.hasPeer(ethPoint.eid, ethPoint.address)).toBe(true)
    })

    /**
     * Helper function to perform OmniCounter.increment(...) and return the matching PacketSent logs.
     * @param {number} type
     * @param {Options} options
     */
    const incrementAndReturnLogs = async (type: number, options: Options) => {
        const incrementOutput = await ethSdk.increment(avaxPoint.eid, type, options.toBytes(), avaxPoint.address)
        const incrementTx: OmniTransaction = {
            ...incrementOutput.omniTransaction,
            gasLimit: applyPremium(incrementOutput.gasLimit),
            value: applyPremium(incrementOutput.messagingFee.nativeFee),
        }

        const ethEndpointPoint = omniContractToPoint(await contractFactory(ethEndpoint))
        const endpointSdkFactory = createEndpointFactory(contractFactory)
        const ethEndpointSdk = await endpointSdkFactory(ethEndpointPoint)
        const incrementTxResponse = await ethSigner.signAndSend(incrementTx)
        const incrementTxReceipt: TransactionReceipt = await incrementTxResponse.wait()
        expect(incrementTxReceipt.status).toEqual(1)
        return parseLogsWithName(incrementTxReceipt, ethEndpointSdk.contract.contract, 'PacketSent')
    }

    it('executorLzReceiveOption', async () => {
        // sanity check that generated options are the same with value as 0 and not provided.
        expect(Options.newOptions().addExecutorLzReceiveOption(1, 0)).toEqual(
            Options.newOptions().addExecutorLzReceiveOption(1)
        )
        await fc.assert(
            fc.asyncProperty(
                OMNICOUNTER_INCREMENT_TYPE_ARBITRARY,
                GAS_LIMIT_ARBITRARY,
                NATIVE_DROP_ARBITRARY,

                /**
                 * Test the generation and submission of arbitrary LZ_RECEIVE Options.  The transaction should succeed,
                 * and the options from the transaction receipt logs should match the generated input.
                 * @param {number} type
                 * @param {bigint} gasLimit
                 * @param {bigint} value
                 */
                async (type: number, gasLimit: bigint, value: bigint) => {
                    const options = Options.newOptions().addExecutorLzReceiveOption(
                        gasLimit.toString(),
                        value.toString()
                    )
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toHaveLength(1)
                    expect(packetSentEvents[0]!.args.options.toLowerCase() === options.toHex().toLowerCase())
                }
            )
        )
    })

    it('executorComposeOption', async () => {
        await fc.assert(
            fc.asyncProperty(
                OMNICOUNTER_INCREMENT_TYPE_ARBITRARY,
                INDEX_ARBITRARY,
                GAS_LIMIT_ARBITRARY,
                NATIVE_DROP_ARBITRARY,

                /**
                 * Test the generation and submission of arbitrary COMPOSE Options.  The transaction should succeed, and
                 * the options from the transaction receipt logs should match the generated input.
                 * @param {number} type
                 * @param {number} index
                 * @param {bigint} gasLimit
                 * @param {bigint} value
                 */
                async (type: number, index: number, gasLimit: bigint, value: bigint) => {
                    const options = Options.newOptions().addExecutorComposeOption(
                        index,
                        gasLimit.toString(),
                        value.toString()
                    )
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toHaveLength(1)
                    expect(packetSentEvents[0]!.args.options.toLowerCase() === options.toHex().toLowerCase())
                }
            )
        )
    })

    it('executorLzNativeDrop', async () => {
        const address = await ethSigner.signer.getAddress()
        await fc.assert(
            fc.asyncProperty(
                OMNICOUNTER_INCREMENT_TYPE_ARBITRARY,
                NATIVE_DROP_ARBITRARY,

                /**
                 * Test the generation and submission of arbitrary NATIVE_DROP Options.  The transaction should
                 * succeed, and the options from the transaction receipt logs should match the generated input.
                 * @param type
                 * @param value
                 */
                async (type: number, value: bigint) => {
                    const options = Options.newOptions().addExecutorNativeDropOption(value.toString(), address)
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toHaveLength(1)
                    expect(packetSentEvents[0]!.args.options.toLowerCase() === options.toHex().toLowerCase())
                }
            )
        )
    })

    it('executorOrderedExecutionOption', async () => {
        await fc.assert(
            /**
             * Test the generation and submission of arbitrary ORDERED Options.  The transaction should succeed, and the
             * options from the transaction receipt logs should match the generated input.
             */
            fc.asyncProperty(fc.integer({ min: 1, max: 4 }), async (type) => {
                const options = Options.newOptions().addExecutorOrderedExecutionOption()
                const packetSentEvents = await incrementAndReturnLogs(type, options)
                expect(packetSentEvents).toHaveLength(1)
                expect(packetSentEvents[0]!.args.options.toLowerCase() === options.toHex().toLowerCase())
            })
        )
    })

    it('stacked options', async () => {
        // custom gasLimit arbitrary so "stacked" compose options won't have a gasLimit sum that overflows MAX_UINT_128
        const stackedGasLimitArbitrary: fc.Arbitrary<bigint> = fc.bigInt({
            min: MIN_GAS_LIMIT,
            max: BigInt('0xFFFFFFFFFFFFFFFF'),
        })

        // custom nativeDrop arbitrary so "stacked" compose options won't have a nativeDrop sum that exceeds DEFAULT_MAX_NATIVE_DROP
        const stackedValueArbitrary: fc.Arbitrary<bigint> = fc.bigInt({
            min: DEFAULT_MIN_NATIVE_DROP,
            max: DEFAULT_MAX_NATIVE_DROP / BigInt(4),
        })

        const address = await ethSigner.signer.getAddress()
        await fc.assert(
            fc.asyncProperty(
                OMNICOUNTER_INCREMENT_TYPE_ARBITRARY,
                INDEX_ARBITRARY,
                stackedGasLimitArbitrary,
                stackedValueArbitrary,

                /**
                 * Test the generation of multiple Options in a single Packet.  The transaction should succeed.  Options
                 * should be decoded to match inputs.  gasLimit and nativeDrop should be summed for Packets that have
                 * multiple COMPOSE options for the same index.
                 * @param type
                 * @param index
                 * @param gasLimit
                 * @param value
                 */
                async (type: number, index: number, gasLimit: bigint, value: bigint) => {
                    const gasLimitStr = gasLimit.toString()
                    const valueStr = value.toString()
                    const options = Options.newOptions()
                        .addExecutorComposeOption(index, gasLimitStr, valueStr)
                        .addExecutorLzReceiveOption(gasLimitStr, valueStr)
                        .addExecutorNativeDropOption(valueStr, address)
                        .addExecutorComposeOption(index, gasLimitStr, valueStr) // Repeat executor compose option to make sure values/gasLimits are summed

                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toHaveLength(1)
                    expect(packetSentEvents[0]!.args.options.toLowerCase() === options.toHex().toLowerCase())
                    const packetOptions = Options.fromOptions(packetSentEvents[0]!.args.options.toLowerCase())

                    // check executorComposeOption
                    const packetComposeOptions = packetOptions.decodeExecutorComposeOption()
                    expect(packetComposeOptions).toHaveLength(1)
                    const packetComposeOption = packetComposeOptions[0]!
                    expect(packetComposeOption.index).toEqual(index)
                    expect(packetComposeOption.gas.toBigInt()).toEqual(gasLimit * BigInt(2))
                    // compose options with same index are summed (in this specific case, just multiplied by 2)
                    expect(packetComposeOption.value.toBigInt()).toEqual(value * BigInt(2))

                    // check executorLzReceiveOption
                    const packetLzReceiveOption = packetOptions.decodeExecutorLzReceiveOption()
                    expect(packetLzReceiveOption).toBeDefined()
                    expect(packetLzReceiveOption!.gas.toBigInt()).toEqual(gasLimit)
                    expect(packetLzReceiveOption!.value.toBigInt()).toEqual(value)

                    // check executorNativeDropOption
                    const packetNativeDropOptions = packetOptions.decodeExecutorNativeDropOption()
                    expect(packetNativeDropOptions).toHaveLength(1)
                    const packetNativeDropOption = packetNativeDropOptions[0]!
                    expect(packetNativeDropOption.amount.toBigInt()).toEqual(value)
                    expect(packetNativeDropOption.receiver.toLowerCase()).toEqual(makeBytes32(address).toLowerCase())
                }
            )
        )
    })
})
