import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniPoint } from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import OApp from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/oapp/OApp.sol/OApp.json'
import OAppOptionsType3 from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/oapp/libs/OAppOptionsType3.sol/OAppOptionsType3.json'
import EndpointV2Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/EndpointV2.json'
import ReceiveUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/ReceiveUln302.json'
import SendUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/SendUln302.json'
import EndpointV2Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/EndpointV2.json'
import ReceiveUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/ReceiveUln302.json'
import SendUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/SendUln302.json'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { OAppOmniGraphHardhatSchema } from '@layerzerolabs/ua-devtools-evm-hardhat'

import { getTronReceiveConfig, getTronSendConfig, initTronWeb } from '../common/taskHelper'
import { findTronEndpointIdInGraph } from '../common/utils'

// Import deployment artifacts from LayerZero SDK

const logger = createLogger()

// Configuration types
const EXECUTOR_CONFIG_TYPE = 1
const ULN_CONFIG_TYPE = 2

// Convert a hex address to Tron base58 if needed
function toBase58(tronWeb: any, addr: string): string {
    if (addr.startsWith('T')) return addr
    const clean = addr.startsWith('0x') ? addr.slice(2) : addr
    const tronHex = clean.startsWith('41') ? clean : `41${clean}`
    return tronWeb.address.fromHex(tronHex)
}

interface Args {
    oappConfig: string
    privateKey: string
}

export default async function wireTron(args: Args, hre: HardhatRuntimeEnvironment) {
    const { oappConfig, privateKey } = args

    if (!oappConfig) throw new Error('Missing oappConfig')
    if (!privateKey) throw new Error('Missing privateKey')

    logger.info('Starting Tron wiring process...')

    let graph: OAppOmniGraph
    try {
        logger.info('Loading OApp configuration...')
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
        logger.info('OApp configuration loaded successfully')
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }

    // Find Tron endpoint ID in the graph
    logger.info('Finding Tron endpoint ID in the graph...')
    const tronEid = await findTronEndpointIdInGraph(hre, oappConfig)
    const isMainnet = tronEid === EndpointId.TRON_V2_MAINNET
    logger.info(`Using ${isMainnet ? 'mainnet' : 'testnet'} configuration`)

    // Get the correct deployment artifacts based on network
    const endpointV2 = isMainnet ? EndpointV2Mainnet : EndpointV2Testnet
    const sendUln302 = isMainnet ? SendUln302Mainnet : SendUln302Testnet
    const receiveUln302 = isMainnet ? ReceiveUln302Mainnet : ReceiveUln302Testnet

    // Initialize TronWeb
    logger.info('Initializing TronWeb...')
    const tronWeb = await initTronWeb(isMainnet ? 'mainnet' : 'testnet', privateKey)
    logger.info('TronWeb initialized successfully')

    // Create SDK factory for EVM chains
    const evmSdkFactory = createOAppFactory(createConnectedContractFactory())

    // Wire the OApp
    logger.info('Starting to wire OApp connections...')
    for (const { vector } of graph.connections) {
        const { from, to } = vector
        const fromIsTron = isTron(from)
        const toIsTron = isTron(to)

        logger.info(
            `Processing connection: ${from.eid} -> ${to.eid} (fromIsTron: ${fromIsTron}, toIsTron: ${toIsTron})`
        )

        if (fromIsTron || toIsTron) {
            // For Tron connections, we'll handle the wiring manually
            if (fromIsTron) {
                logger.info(`Setting up Tron sender (${from.eid} -> ${to.eid})...`)
                try {
                    const oappAddr = toBase58(tronWeb, from.address)
                    const endpointAddr = toBase58(tronWeb, endpointV2.address)
                    const sendLibAddr = toBase58(tronWeb, sendUln302.address)

                    // Get the OApp contract instance
                    logger.info('Getting OApp contract instance...')
                    const oappContract = await tronWeb.contract(OApp.abi, oappAddr)
                    const endpoint = await tronWeb.contract(endpointV2.abi, endpointAddr)

                    // Initialize send library if not already initialized
                    logger.info('Getting send config...')
                    const sendConfig = await getTronSendConfig(tronWeb, to.eid, from.address, isMainnet)
                    logger.info('Send config retrieved:', sendConfig)

                    if (!sendConfig) {
                        logger.info(`Initializing send library for ${from.eid} -> ${to.eid}`)
                        await endpoint.setSendLibrary(oappAddr, to.eid, sendLibAddr).send()

                        // Set ULN config if provided
                        if (sendConfig?.[1]) {
                            logger.info(`Setting ULN config for ${from.eid} -> ${to.eid}`)
                            const ulnConfig = [
                                {
                                    eid: to.eid,
                                    configType: ULN_CONFIG_TYPE,
                                    config: sendConfig[1],
                                },
                            ]
                            await endpoint.setConfig(oappAddr, sendLibAddr, ulnConfig).send()
                        }

                        // Set executor config if provided
                        if (sendConfig?.[2]) {
                            logger.info(`Setting executor config for ${from.eid} -> ${to.eid}`)
                            const executorConfig = [
                                {
                                    eid: to.eid,
                                    configType: EXECUTOR_CONFIG_TYPE,
                                    config: sendConfig[2],
                                },
                            ]
                            await endpoint.setConfig(oappAddr, sendLibAddr, executorConfig).send()
                        }
                    }

                    // Set peer address
                    logger.info(`Setting peer address for ${from.eid} -> ${to.eid}`)
                    await oappContract.setPeer(to.eid, toBase58(tronWeb, to.address)).send()

                    // Set enforced options if provided in the config
                    const enforcedOptions = (vector as any).config?.enforcedOptions
                    if (enforcedOptions) {
                        logger.info(`Setting enforced options for ${from.eid} -> ${to.eid}`)
                        const optionsContract = await tronWeb.contract(OAppOptionsType3.abi, oappAddr)
                        await optionsContract.setEnforcedOptions(enforcedOptions).send()
                    }
                } catch (error) {
                    logger.error(
                        `Error in Tron sender setup: ${error instanceof Error ? error.message : 'Unknown error'}`
                    )
                    throw error
                }
            }

            if (toIsTron) {
                logger.info(`Setting up Tron receiver (${to.eid} <- ${from.eid})...`)
                try {
                    // Get the OApp contract instance
                    logger.info('Getting OApp contract instance...')
                    logger.info('OApp ABI:', JSON.stringify(OApp.abi, null, 2))
                    const oappAddr = toBase58(tronWeb, to.address)
                    const endpointAddr = toBase58(tronWeb, endpointV2.address)
                    const recvLibAddr = toBase58(tronWeb, receiveUln302.address)

                    const oappContract = await tronWeb.contract(OApp.abi, oappAddr)
                    if (!oappContract) {
                        throw new Error(`Failed to create OApp contract instance at ${to.address}`)
                    }
                    logger.info('OApp contract methods:', Object.keys(oappContract))

                    logger.info('Getting Endpoint contract instance...')
                    logger.info('Endpoint ABI:', JSON.stringify(endpointV2.abi, null, 2))
                    const endpoint = await tronWeb.contract(endpointV2.abi, endpointAddr)
                    if (!endpoint) {
                        throw new Error(`Failed to create Endpoint contract instance at ${endpointV2.address}`)
                    }
                    logger.info('Endpoint contract methods:', Object.keys(endpoint))

                    // Initialize receive library if not already initialized
                    logger.info('Getting receive config...')
                    const receiveConfig = await getTronReceiveConfig(tronWeb, from.eid, to.address, isMainnet)
                    logger.info('Receive config retrieved:', receiveConfig)

                    if (!receiveConfig) {
                        logger.info(`Initializing receive library for ${to.eid} <- ${from.eid}`)
                        logger.info('Calling setReceiveLibrary with params:', {
                            receiver: oappAddr,
                            remoteEid: from.eid,
                            library: recvLibAddr,
                            timeout: 0,
                        })

                        try {
                            // Try different ways to call setReceiveLibrary
                            // Method 1: Direct call
                            try {
                                await endpoint.setReceiveLibrary(oappAddr, from.eid, recvLibAddr, BigInt(0)).send()
                                logger.info('Direct call to setReceiveLibrary successful')
                            } catch (error) {
                                logger.error('Direct call to setReceiveLibrary failed:', error)

                                // Method 2: Using contract.methods
                                try {
                                    await endpoint.methods.setReceiveLibrary(oappAddr, from.eid, recvLibAddr, 0).send()
                                    logger.info('Contract.methods call to setReceiveLibrary successful')
                                } catch (error) {
                                    logger.error('Contract.methods call to setReceiveLibrary failed:', error)
                                    throw error
                                }
                            }

                            // Set ULN config if provided
                            if (receiveConfig?.[1]) {
                                logger.info(`Setting ULN config for ${to.eid} <- ${from.eid}`)
                                const ulnConfig = [
                                    {
                                        eid: from.eid,
                                        configType: ULN_CONFIG_TYPE,
                                        config: receiveConfig[1],
                                    },
                                ]
                                await endpoint.setConfig(oappAddr, recvLibAddr, ulnConfig).send()
                            }

                            // Set timeout config if provided
                            if (receiveConfig?.[2]) {
                                const timeout = receiveConfig[2] as Timeout
                                logger.info(`Setting timeout config for ${to.eid} <- ${from.eid}`)
                                await endpoint
                                    .setReceiveLibraryTimeout(oappAddr, from.eid, recvLibAddr, timeout.expiry)
                                    .send()
                            }
                        } catch (error) {
                            logger.error('Error in contract calls:', {
                                error: error instanceof Error ? error.message : 'Unknown error',
                                stack: error instanceof Error ? error.stack : undefined,
                                contract: 'Endpoint',
                                method: 'setReceiveLibrary',
                                params: {
                                    receiver: oappAddr,
                                    remoteEid: from.eid,
                                    library: recvLibAddr,
                                    timeout: 0,
                                },
                            })
                            throw error
                        }
                    }

                    // Set peer address
                    logger.info(`Setting peer address for ${to.eid} <- ${from.eid}`)
                    try {
                        await oappContract.setPeer(from.eid, toBase58(tronWeb, from.address)).send()
                        logger.info('Successfully set peer address')
                    } catch (error) {
                        logger.error('Error setting peer address:', {
                            error: error instanceof Error ? error.message : 'Unknown error',
                            stack: error instanceof Error ? error.stack : undefined,
                            contract: 'OApp',
                            method: 'setPeer',
                            params: {
                                eid: from.eid,
                                peer: toBase58(tronWeb, from.address),
                            },
                        })
                        throw error
                    }

                    // Set enforced options if provided in the config
                    const enforcedOptions = (vector as any).config?.enforcedOptions
                    if (enforcedOptions) {
                        logger.info(`Setting enforced options for ${to.eid} <- ${from.eid}`)
                        try {
                            const optionsContract = await tronWeb.contract(OAppOptionsType3.abi, oappAddr)
                            await optionsContract.setEnforcedOptions(enforcedOptions).send()
                            logger.info('Successfully set enforced options')
                        } catch (error) {
                            logger.error('Error setting enforced options:', {
                                error: error instanceof Error ? error.message : 'Unknown error',
                                stack: error instanceof Error ? error.stack : undefined,
                                contract: 'OAppOptionsType3',
                                method: 'setEnforcedOptions',
                                params: enforcedOptions,
                            })
                            throw error
                        }
                    }
                } catch (error) {
                    logger.error(
                        `Error in Tron receiver setup: ${error instanceof Error ? error.message : 'Unknown error'}`
                    )
                    throw error
                }
            }
        } else {
            // For EVM connections, use the SDK
            logger.info(`Setting up EVM connection (${from.eid} <-> ${to.eid})...`)
            try {
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
            } catch (error) {
                logger.error(
                    `Error in EVM connection setup: ${error instanceof Error ? error.message : 'Unknown error'}`
                )
                throw error
            }
        }
    }
    logger.info('OApp wiring completed successfully')
}

function isTron(point: OmniPoint): boolean {
    return point.eid === EndpointId.TRON_V2_MAINNET || point.eid === EndpointId.TRON_V2_TESTNET
}
