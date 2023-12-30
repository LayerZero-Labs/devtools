import { makeBytes32, OmniSignerEVM, parseLogsWithName } from '@layerzerolabs/devtools-evm'
import { parseEther } from 'ethers/lib/utils'
import fc from 'fast-check'
import 'hardhat'
import { TransactionReceipt } from '@ethersproject/providers'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-utility-v2'
import { createOmniCounterFactory, OmniCounter } from '@layerzerolabs/omnicounter-devtools-evm'
import { createEndpointFactory } from '@layerzerolabs/protocol-devtools-evm'
import { configureOAppPeers, OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
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

const TX_STATUS_SUCCESS = 1

const applyPremium = (fee: bigint) => (BigInt(fee) * BigInt(110)) / BigInt(100)

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
        const avaxSigner = await signerFactory(avaxOmniCounter.eid)

        const config: OmniGraphHardhat<unknown, OAppEdgeConfig> = setUpOmniGraphHardhat(
            ethOmniCounter,
            ethOAppConfig,
            avaxOmniCounter,
            avaxOAppConfig
        )

        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        const transactions = await configureOAppPeers(builder.graph, sdkFactory)
        for (const transaction of transactions) {
            const signer = transaction.point.eid === EndpointId.ETHEREUM_V2_MAINNET ? ethSigner : avaxSigner
            const txResponse = await signer.signAndSend(transaction)
            const txReceipt: TransactionReceipt = await txResponse.wait()
            expect(txReceipt.status).toBe(TX_STATUS_SUCCESS)
        }

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
        // sanity check
        expect(Options.newOptions().addExecutorLzReceiveOption(1, 0)).toEqual(
            Options.newOptions().addExecutorLzReceiveOption(1)
        )
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 4 }),
                fc.bigInt({ min: BigInt(0), max: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF') }),
                fc.bigInt({ min: BigInt(0), max: parseEther('0.25').toBigInt() }), // nativeCap set to 0.25 eth in 001_bootstrap.ts,
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
                fc.integer({ min: 1, max: 4 }),
                fc.integer({ min: 1, max: 0xff }), // index is type uint16
                fc.bigInt({ min: BigInt(0), max: BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF') }),
                fc.bigInt({ min: BigInt(0), max: parseEther('0.25').toBigInt() }), // nativeCap set to 0.25 eth in 001_bootstrap.ts
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
                fc.integer({ min: 1, max: 4 }),
                fc.bigInt({ min: BigInt(0), max: parseEther('0.25').toBigInt() }), // nativeCap set to 0.25 eth in 001_bootstrap.ts
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
            fc.asyncProperty(fc.integer({ min: 1, max: 4 }), async (type) => {
                const options = Options.newOptions().addExecutorOrderedExecutionOption()
                const packetSentEvents = await incrementAndReturnLogs(type, options)
                expect(packetSentEvents).toHaveLength(1)
                expect(packetSentEvents[0]!.args.options.toLowerCase() === options.toHex().toLowerCase())
            })
        )
    })

    it('stacked options', async () => {
        const address = await ethSigner.signer.getAddress()
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 4 }),
                fc.integer({ min: 1, max: 0xff }), // index is type uint16
                fc.bigInt({ min: BigInt(0), max: BigInt('0xFFFFFFFFFFFFFFFF') }),
                fc.bigInt({ min: BigInt(0), max: parseEther('0.25').toBigInt() / BigInt(4) }), // nativeCap set to 0.25 eth in 001_bootstrap.ts, divide by 4
                async (type: number, index: number, gasLimit: bigint, value: bigint) => {
                    const gasLimitStr = gasLimit.toString()
                    const valueStr = value.toString()
                    const options = Options.newOptions()
                        .addExecutorComposeOption(index, gasLimitStr, valueStr)
                        .addExecutorLzReceiveOption(gasLimitStr, valueStr)
                        .addExecutorNativeDropOption(valueStr, address)
                        .addExecutorComposeOption(index, gasLimitStr, valueStr) // repeated executor compose option same index

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
                    // compose options with same index are stacked
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
