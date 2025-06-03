import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniPoint } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import ReceiveUln302 from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/ReceiveUln302.json'
import SendUln302 from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/SendUln302.json'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
    TASK_LZ_OAPP_WIRE,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { OAppOmniGraphHardhatSchema } from '@layerzerolabs/ua-devtools-evm-hardhat'

import wireTron from '../tron/wire'

import { getTronReceiveConfig, getTronSendConfig, initTronWeb } from './taskHelper'
import { findTronEndpointIdInGraph } from './utils'

const logger = createLogger()

// Tron ULN program addresses from LayerZero SDK deployments
const SEND_ULN_ADDRESS = SendUln302.address
const RECEIVE_ULN_ADDRESS = ReceiveUln302.address

interface Args {
    oappConfig: string
    tronPrivateKey?: string
    skipConnectionsFromEids?: EndpointId[]
}

/**
 * Extend the default wire task to support Tron endpoints using TronWeb.
 */
task(TASK_LZ_OAPP_WIRE)
    .addOptionalParam('tronPrivateKey', 'Private key for Tron wiring', undefined, devtoolsTypes.string)
    .setAction(async (args: Args, hre, runSuper) => {
        let tronEid: EndpointId | undefined
        try {
            tronEid = await findTronEndpointIdInGraph(hre, args.oappConfig)
        } catch {
            // configuration may not reference Tron
        }

        if (tronEid) {
            logger.info('Detected Tron endpoint, wiring via TronWeb')
            await wireTron(
                {
                    oappConfig: args.oappConfig,
                    privateKey: args.tronPrivateKey ?? process.env.PRIVATE_KEY ?? '',
                },
                hre
            )
            args.skipConnectionsFromEids = [...(args.skipConnectionsFromEids ?? []), tronEid]
        }

        return runSuper(args)
    })

export default async function (args: Args, hre: HardhatRuntimeEnvironment) {
    const { oappConfig, tronPrivateKey, skipConnectionsFromEids } = args

    if (!oappConfig) throw new Error('Missing oappConfig')
    if (!tronPrivateKey && !process.env.PRIVATE_KEY) throw new Error('Missing tronPrivateKey or PRIVATE_KEY')

    let graph: OAppOmniGraph
    try {
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }

    // Find Tron endpoint ID in the graph
    const tronEid = await findTronEndpointIdInGraph(hre, oappConfig)

    // Initialize TronWeb
    const tronWeb = initTronWeb(
        tronEid === EndpointId.TRON_V2_MAINNET ? 'mainnet' : 'testnet',
        tronPrivateKey ?? process.env.PRIVATE_KEY ?? ''
    )

    // Create SDK factory for EVM chains
    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())

    // Wire the OApp
    for (const { vector } of graph.connections) {
        const { from, to } = vector
        const fromIsTron = isTron(from)
        const toIsTron = isTron(to)

        if (fromIsTron || toIsTron) {
            // For Tron connections, we'll handle the wiring manually
            if (fromIsTron) {
                // Get the OApp contract instance
                const oapp = await tronWeb.contract(SendUln302.abi, from.address)
                const endpoint = await tronWeb.contract(SendUln302.abi, await oapp.endpoint().call())

                // Initialize send library if not already initialized
                const sendConfig = await getTronSendConfig(
                    tronWeb,
                    to.eid,
                    from.address,
                    tronEid === EndpointId.TRON_V2_TESTNET
                )
                if (!sendConfig) {
                    logger.verbose(`Initializing send library for ${from.eid} -> ${to.eid}`)
                    const data = endpoint.interface.encodeFunctionData('setSendLibrary', [
                        from.address,
                        to.eid,
                        SEND_ULN_ADDRESS,
                    ])
                    await endpoint.setSendLibrary(from.address, to.eid, SEND_ULN_ADDRESS).send()

                    // Set ULN config if provided
                    if (sendConfig?.[1]) {
                        logger.verbose(`Setting ULN config for ${from.eid} -> ${to.eid}`)
                        const ulnConfig = [
                            {
                                eid: to.eid,
                                ulnConfig: sendConfig[1],
                            },
                        ]
                        const configData = endpoint.interface.encodeFunctionData('setConfig', [
                            from.address,
                            SEND_ULN_ADDRESS,
                            ulnConfig,
                        ])
                        await endpoint.setConfig(from.address, SEND_ULN_ADDRESS, ulnConfig).send()
                    }

                    // Set executor config if provided
                    if (sendConfig?.[2]) {
                        logger.verbose(`Setting executor config for ${from.eid} -> ${to.eid}`)
                        const executorConfig = [
                            {
                                eid: to.eid,
                                executorConfig: sendConfig[2],
                            },
                        ]
                        const configData = endpoint.interface.encodeFunctionData('setConfig', [
                            from.address,
                            SEND_ULN_ADDRESS,
                            executorConfig,
                        ])
                        await endpoint.setConfig(from.address, SEND_ULN_ADDRESS, executorConfig).send()
                    }
                }

                // Set peer address
                logger.verbose(`Setting peer address for ${from.eid} -> ${to.eid}`)
                const peerData = oapp.interface.encodeFunctionData('setPeer', [to.eid, to.address])
                await oapp.setPeer(to.eid, to.address).send()

                // Set enforced options if provided in the config
                const enforcedOptions = (vector as any).config?.enforcedOptions
                if (enforcedOptions) {
                    logger.verbose(`Setting enforced options for ${from.eid} -> ${to.eid}`)
                    const optionsData = oapp.interface.encodeFunctionData('setEnforcedOptions', [enforcedOptions])
                    await oapp.setEnforcedOptions(enforcedOptions).send()
                }
            }

            if (toIsTron) {
                // Get the OApp contract instance
                const oapp = await tronWeb.contract(ReceiveUln302.abi, to.address)
                const endpoint = await tronWeb.contract(ReceiveUln302.abi, await oapp.endpoint().call())

                // Initialize receive library if not already initialized
                const receiveConfig = await getTronReceiveConfig(
                    tronWeb,
                    from.eid,
                    to.address,
                    tronEid === EndpointId.TRON_V2_TESTNET
                )
                if (!receiveConfig) {
                    logger.verbose(`Initializing receive library for ${to.eid} <- ${from.eid}`)
                    const data = endpoint.interface.encodeFunctionData('setReceiveLibrary', [
                        to.address,
                        from.eid,
                        RECEIVE_ULN_ADDRESS,
                        BigInt(0), // grace period
                    ])
                    await endpoint.setReceiveLibrary(to.address, from.eid, RECEIVE_ULN_ADDRESS, BigInt(0)).send()

                    // Set ULN config if provided
                    if (receiveConfig?.[1]) {
                        logger.verbose(`Setting ULN config for ${to.eid} <- ${from.eid}`)
                        const ulnConfig = [
                            {
                                eid: from.eid,
                                ulnConfig: receiveConfig[1],
                            },
                        ]
                        const configData = endpoint.interface.encodeFunctionData('setConfig', [
                            to.address,
                            RECEIVE_ULN_ADDRESS,
                            ulnConfig,
                        ])
                        await endpoint.setConfig(to.address, RECEIVE_ULN_ADDRESS, ulnConfig).send()
                    }

                    // Set timeout config if provided
                    if (receiveConfig?.[2]) {
                        const timeout = receiveConfig[2] as Timeout
                        logger.verbose(`Setting timeout config for ${to.eid} <- ${from.eid}`)
                        const timeoutData = endpoint.interface.encodeFunctionData('setReceiveLibraryTimeout', [
                            to.address,
                            from.eid,
                            RECEIVE_ULN_ADDRESS,
                            timeout.expiry,
                        ])
                        await endpoint
                            .setReceiveLibraryTimeout(to.address, from.eid, RECEIVE_ULN_ADDRESS, timeout.expiry)
                            .send()
                    }
                }

                // Set peer address
                logger.verbose(`Setting peer address for ${to.eid} <- ${from.eid}`)
                const peerData = oapp.interface.encodeFunctionData('setPeer', [from.eid, from.address])
                await oapp.setPeer(from.eid, from.address).send()

                // Set enforced options if provided in the config
                const enforcedOptions = (vector as any).config?.enforcedOptions
                if (enforcedOptions) {
                    logger.verbose(`Setting enforced options for ${to.eid} <- ${from.eid}`)
                    const optionsData = oapp.interface.encodeFunctionData('setEnforcedOptions', [enforcedOptions])
                    await oapp.setEnforcedOptions(enforcedOptions).send()
                }
            }
        } else {
            // For EVM connections, use the SDK
            const fromSdk = await evmSdkFactory(from)
            const toSdk = await evmSdkFactory(to)

            // Set peer addresses
            await fromSdk.setPeer(to.eid, to.address)
            await toSdk.setPeer(from.eid, from.address)

            // Set enforced options if provided in the config
            const enforcedOptions = (vector as any).config?.enforcedOptions
            if (enforcedOptions) {
                await fromSdk.setEnforcedOptions(enforcedOptions)
                await toSdk.setEnforcedOptions(enforcedOptions)
            }
        }
    }
}

function isTron(point: OmniPoint): boolean {
    return point.eid === EndpointId.TRON_V2_MAINNET || point.eid === EndpointId.TRON_V2_TESTNET
}
