/// <reference types="jest-extended" />

import { OmniSignerEVM, parseLogsWithName, ProviderFactory } from '@layerzerolabs/devtools-evm'
import { parseEther } from 'ethers/lib/utils'
import fc from 'fast-check'
import 'hardhat'
import { TransactionReceipt } from '@ethersproject/providers'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { IncrementType } from '@layerzerolabs/omnicounter-devtools'
import { createOmniCounterFactory, OmniCounter } from '@layerzerolabs/omnicounter-devtools-evm'
import { createEndpointV2Factory } from '@layerzerolabs/protocol-devtools-evm'
import { configureOAppPeers, OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { createSignAndSend, makeBytes32, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import {
    createConnectedContractFactory,
    createProviderFactory,
    createSignerFactory,
    OmniContractFactoryHardhat,
    OmniGraphBuilderHardhat,
    OmniGraphHardhat,
} from '@layerzerolabs/devtools-evm-hardhat'
import {
    setupDefaultEndpointV2,
    getDefaultAvaxConfig,
    getDefaultEthConfig,
    OAppTestConfig,
    setUpConfig,
    setUpOmniGraphHardhat,
    deployContract,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import assert from 'assert'

// The maximum value of an uint16.
const MAX_UINT_16: number = 0xffff

// The maximum value of an uint128.
const MAX_UINT_128: bigint = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')

// The minimum native drop measured in native gas unit.
const DEFAULT_MIN_NATIVE_DROP: bigint = BigInt(0)

// The maximum native drop measured in native gas unit (currently configured in 001_bootstap.ts).
const DEFAULT_MAX_NATIVE_DROP: bigint = parseEther('0.25').toBigInt()

// The minimum gasLimit for an Option.
const MIN_GAS_LIMIT = BigInt(1)

// The maximum gasLimit for an Option.
const MAX_GAS_LIMIT = MAX_UINT_128

// The minimum index for a Composed Option.
const MIN_COMPOSED_INDEX: number = 0

// The maximum index for a Composed Option.
const MAX_COMPOSED_INDEX: number = MAX_UINT_16

// An OmniCounter User Application specific arbitrary using the different types of "increment".
const omnicounterIncrementTypeArbitrary: fc.Arbitrary<IncrementType> = fc.constantFrom(
    IncrementType.VANILLA_TYPE,
    IncrementType.COMPOSED_TYPE,
    IncrementType.ABA_TYPE,
    IncrementType.COMPOSED_ABA_TYPE
)

// An arbitrary for gasLimit.
const gasLimitArbitrary: fc.Arbitrary<bigint> = fc.bigInt({ min: MIN_GAS_LIMIT, max: MAX_GAS_LIMIT })

// An arbitrary for value (native drop).
const nativeDropArbitrary: fc.Arbitrary<bigint> = fc.bigInt({
    min: DEFAULT_MIN_NATIVE_DROP,
    max: DEFAULT_MAX_NATIVE_DROP,
})

// An arbitrary for Composed Option index.
const composedIndexArbitrary: fc.Arbitrary<number> = fc.integer({ min: MIN_COMPOSED_INDEX, max: MAX_COMPOSED_INDEX })

/**
 * Helper used to apply a 10% premium to input.
 * @param {bigint} input
 */
const applyPremium = (input: bigint) => (BigInt(input) * BigInt(110)) / BigInt(100)

// Test the OApp options using the OmniCounter OApp as the test contract.
describe('oapp/options', () => {
    const ethOmniCounter = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'OmniCounter' }
    const avaxOmniCounter = { eid: EndpointId.AVALANCHE_V2_MAINNET, contractName: 'OmniCounter' }
    const ethEndpointV2 = { eid: EndpointId.ETHEREUM_V2_MAINNET, contractName: 'EndpointV2' }

    let ethSdk: OmniCounter
    let ethSigner: OmniSignerEVM
    let avaxPoint: OmniPoint
    let contractFactory: OmniContractFactoryHardhat
    let providerFactory: ProviderFactory

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
        await deployContract('OmniCounter')

        providerFactory = createProviderFactory()
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

        const config: OmniGraphHardhat<undefined, OAppEdgeConfig> = setUpOmniGraphHardhat(
            ethOmniCounter,
            ethOAppConfig,
            avaxOmniCounter,
            avaxOAppConfig
        )

        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const transactions = await configureOAppPeers(builder.graph, sdkFactory)
        const signAndSend = createSignAndSend(createSignerFactory())
        const [_, errors] = await signAndSend(transactions)

        assert(errors.length === 0, 'Failed to configure the OApp')
    })

    // Helper function to perform OmniCounter.increment(...) and return the matching PacketSent logs.
    const incrementAndReturnLogs = async (type: number, options: Options) => {
        const incrementOutput = await ethSdk.increment(avaxPoint.eid, type, options.toBytes(), avaxPoint.address)
        const incrementTx: OmniTransaction = {
            ...incrementOutput.omniTransaction,
            gasLimit: applyPremium(incrementOutput.gasLimit),
            value: applyPremium(incrementOutput.messagingFee.nativeFee),
        }

        const ethEndpointPointV2 = omniContractToPoint(await contractFactory(ethEndpointV2))
        const endpointV2SdkFactory = createEndpointV2Factory(providerFactory)
        const ethEndpointV2Sdk = await endpointV2SdkFactory(ethEndpointPointV2)
        const incrementTxResponse = await ethSigner.signAndSend(incrementTx)
        const incrementTxReceipt: TransactionReceipt = await incrementTxResponse.wait()
        expect(incrementTxReceipt.status).toEqual(1)
        return parseLogsWithName(incrementTxReceipt, ethEndpointV2Sdk.contract.contract, 'PacketSent')
    }

    it('executorLzReceiveOption', async () => {
        // sanity check that generated options are the same with value as 0 and not provided.
        expect(Options.newOptions().addExecutorLzReceiveOption(1, 0)).toEqual(
            Options.newOptions().addExecutorLzReceiveOption(1)
        )
        await fc.assert(
            fc.asyncProperty(
                omnicounterIncrementTypeArbitrary,
                gasLimitArbitrary,
                nativeDropArbitrary,

                // Test the generation and submission of arbitrary LZ_RECEIVE Options.  The transaction should succeed,
                // and the options from the transaction receipt logs should match the generated input.
                async (type, gasLimit, nativeDrop) => {
                    const options = Options.newOptions().addExecutorLzReceiveOption(gasLimit, nativeDrop)
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toEqual([
                        expect.objectContaining({
                            args: expect.objectContaining({
                                options: expect.toEqualCaseInsensitive(options.toHex()),
                            }),
                        }),
                    ])
                    const rawPacketOptions = packetSentEvents[0]!.args.options
                    expect(rawPacketOptions).toEqualCaseInsensitive(options.toHex())

                    // test decoding
                    const packetOptions = Options.fromOptions(rawPacketOptions)
                    const decodedExecutorLzReceiveOption = packetOptions.decodeExecutorLzReceiveOption()
                    expect(decodedExecutorLzReceiveOption).toEqual({
                        gas: gasLimit,
                        value: nativeDrop,
                    })
                    expect(packetOptions.decodeExecutorNativeDropOption()).toEqual([])
                    expect(packetOptions.decodeExecutorComposeOption()).toEqual([])
                    expect(packetOptions.decodeExecutorOrderedExecutionOption()).toEqual(false)
                }
            ),
            { numRuns: 20 }
        )
    })

    it('executorComposeOption', async () => {
        await fc.assert(
            fc.asyncProperty(
                omnicounterIncrementTypeArbitrary,
                composedIndexArbitrary,
                gasLimitArbitrary,
                nativeDropArbitrary,

                // Test the generation and submission of arbitrary COMPOSE Options.  The transaction should succeed, and
                // the options from the transaction receipt logs should match the generated input.
                async (type, index, gasLimit, nativeDrop) => {
                    const options = Options.newOptions()
                        .addExecutorComposeOption(index, gasLimit, nativeDrop)
                        // We also need to add a lzReceive option to avoid Executor_ZeroLzReceiveGasProvided error
                        .addExecutorLzReceiveOption(MIN_GAS_LIMIT)
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toEqual([
                        expect.objectContaining({
                            args: expect.objectContaining({
                                options: expect.toEqualCaseInsensitive(options.toHex()),
                            }),
                        }),
                    ])
                    const rawPacketOptions = packetSentEvents[0]!.args.options
                    expect(rawPacketOptions).toEqualCaseInsensitive(options.toHex())

                    // test decoding
                    const packetOptions = Options.fromOptions(rawPacketOptions)
                    const decodedExecutorComposeOptions = packetOptions.decodeExecutorComposeOption()
                    expect(decodedExecutorComposeOptions).toEqual([
                        {
                            index,
                            gas: gasLimit,
                            value: nativeDrop,
                        },
                    ])
                    expect(packetOptions.decodeExecutorLzReceiveOption()).toEqual({
                        gas: MIN_GAS_LIMIT,
                        value: BigInt(0),
                    })
                    expect(packetOptions.decodeExecutorNativeDropOption()).toEqual([])
                    expect(packetOptions.decodeExecutorOrderedExecutionOption()).toEqual(false)
                }
            ),
            { numRuns: 20 }
        )
    })

    it('executorLzNativeDrop', async () => {
        const address = await ethSigner.signer.getAddress()
        await fc.assert(
            fc.asyncProperty(
                omnicounterIncrementTypeArbitrary,
                nativeDropArbitrary,

                // Test the generation and submission of arbitrary NATIVE_DROP Options.  The transaction should succeed,
                // and the options from the transaction receipt logs should match the generated input.
                async (type, nativeDrop) => {
                    const options = Options.newOptions()
                        .addExecutorNativeDropOption(nativeDrop, address)
                        // We also need to add a lzReceive option to avoid Executor_ZeroLzReceiveGasProvided error
                        .addExecutorLzReceiveOption(MIN_GAS_LIMIT)
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toEqual([
                        expect.objectContaining({
                            args: expect.objectContaining({
                                options: expect.toEqualCaseInsensitive(options.toHex()),
                            }),
                        }),
                    ])
                    const rawPacketOptions = packetSentEvents[0]!.args.options
                    expect(rawPacketOptions).toEqualCaseInsensitive(options.toHex())

                    // test decoding
                    const packetOptions = Options.fromOptions(rawPacketOptions)
                    const decodedExecutorNativeDropOptions = packetOptions.decodeExecutorNativeDropOption()
                    expect(decodedExecutorNativeDropOptions).toEqual([
                        {
                            amount: nativeDrop,
                            receiver: expect.toEqualCaseInsensitive(makeBytes32(address)),
                        },
                    ])
                    expect(packetOptions.decodeExecutorLzReceiveOption()).toEqual({
                        gas: MIN_GAS_LIMIT,
                        value: BigInt(0),
                    })
                    expect(packetOptions.decodeExecutorComposeOption()).toEqual([])
                    expect(packetOptions.decodeExecutorOrderedExecutionOption()).toEqual(false)
                }
            ),
            { numRuns: 20 }
        )
    })

    it('executorOrderedExecutionOption', async () => {
        await fc.assert(
            fc.asyncProperty(
                omnicounterIncrementTypeArbitrary,

                // Test the generation and submission of arbitrary ORDERED Options.  The transaction should succeed, and the
                // options from the transaction receipt logs should match the generated input.
                async (type) => {
                    const options = Options.newOptions()
                        .addExecutorOrderedExecutionOption()
                        // We also need to add a lzReceive option to avoid Executor_ZeroLzReceiveGasProvided error
                        .addExecutorLzReceiveOption(MIN_GAS_LIMIT)
                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toHaveLength(1)
                    const rawPacketOptions = packetSentEvents[0]!.args.options.toLowerCase()
                    expect(rawPacketOptions).toBe(options.toHex().toLowerCase())

                    // test decoding
                    const packetOptions = Options.fromOptions(rawPacketOptions)
                    expect(packetOptions.decodeExecutorOrderedExecutionOption()).toBe(true)
                    expect(packetOptions.decodeExecutorLzReceiveOption()).toEqual({
                        gas: MIN_GAS_LIMIT,
                        value: BigInt(0),
                    })
                    expect(packetOptions.decodeExecutorComposeOption()).toEqual([])
                    expect(packetOptions.decodeExecutorNativeDropOption()).toEqual([])
                }
            ),
            { numRuns: 10 }
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
                omnicounterIncrementTypeArbitrary,
                composedIndexArbitrary,
                stackedGasLimitArbitrary,
                stackedValueArbitrary,

                // Test the generation of multiple Options in a single Packet.  The transaction should succeed.  Options
                // should be decoded to match inputs.  gasLimit and nativeDrop should be summed for Packets that have
                // multiple COMPOSE options for the same index.
                async (type, index, gasLimit, stackedValue) => {
                    const options = Options.newOptions()
                        .addExecutorComposeOption(index, gasLimit, stackedValue)
                        .addExecutorLzReceiveOption(gasLimit, stackedValue)
                        .addExecutorNativeDropOption(stackedValue, address)
                        .addExecutorComposeOption(index, gasLimit, stackedValue) // Repeat executor compose option to make sure values/gasLimits are summed

                    const packetSentEvents = await incrementAndReturnLogs(type, options)
                    expect(packetSentEvents).toEqual([
                        expect.objectContaining({
                            args: expect.objectContaining({
                                options: expect.toEqualCaseInsensitive(options.toHex()),
                            }),
                        }),
                    ])
                    const packetOptions = Options.fromOptions(packetSentEvents[0]!.args.options)

                    // check executorComposeOption
                    const packetComposeOptions = packetOptions.decodeExecutorComposeOption()
                    expect(packetComposeOptions).toEqual([
                        {
                            index,
                            gas: gasLimit * BigInt(2),
                            // compose options with same index are summed (in this specific case, just multiplied by 2)
                            value: stackedValue * BigInt(2),
                        },
                    ])

                    // check executorLzReceiveOption
                    const packetLzReceiveOption = packetOptions.decodeExecutorLzReceiveOption()
                    expect(packetLzReceiveOption).toEqual({
                        gas: gasLimit,
                        value: stackedValue,
                    })

                    // check executorNativeDropOption
                    const packetNativeDropOptions = packetOptions.decodeExecutorNativeDropOption()
                    expect(packetNativeDropOptions).toEqual([
                        {
                            amount: stackedValue,
                            receiver: expect.toEqualCaseInsensitive(makeBytes32(address)),
                        },
                    ])
                }
            )
        )
    })

    // regression test to ensure Options builder does not overflow when decoding very large gasLimit/value
    it('should not encounter numerical overflow during decoding', () => {
        expect(
            Options.newOptions().addExecutorLzReceiveOption(MAX_GAS_LIMIT).decodeExecutorLzReceiveOption()!.gas
        ).toEqual(MAX_GAS_LIMIT)
        expect(
            Options.newOptions().addExecutorLzReceiveOption(0, MAX_UINT_128).decodeExecutorLzReceiveOption()!.value
        ).toEqual(MAX_GAS_LIMIT)
    })
})
