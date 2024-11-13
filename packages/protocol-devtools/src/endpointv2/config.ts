import { createModuleLogger, createWithAsyncLogger, printBoolean } from '@layerzerolabs/io-devtools'
import {
    type OmniTransaction,
    OmniPointMap,
    Bytes32,
    createConfigureNodes,
    formatOmniPoint,
    createConfigureMultiple,
    createConfigureEdges,
    formatOmniVector,
} from '@layerzerolabs/devtools'
import type { EndpointV2Configurator } from './types'

const createEndpointV2Logger = () => createModuleLogger('EndpointV2')
const withEndpointV2Logger = createWithAsyncLogger(createEndpointV2Logger)

export const configureEndpointV2RegisterLibraries: EndpointV2Configurator = withEndpointV2Logger(
    createConfigureMultiple(
        withEndpointV2Logger(
            async (graph, createSdk): Promise<OmniTransaction[]> => {
                const logger = createEndpointV2Logger()
                const librariesByEndpoint = graph.connections.reduce(
                    (librariesByEndpoint, { vector: { from }, config }) =>
                        librariesByEndpoint.set(
                            from,
                            librariesByEndpoint
                                .getOrElse(from, () => new Set<string>())
                                .add(config.defaultReceiveLibrary)
                                .add(config.defaultSendLibrary)
                        ),
                    new OmniPointMap<Set<Bytes32>>()
                )

                graph.contracts.forEach(({ point, config }) => {
                    config?.readChannelConfigs?.forEach(({ defaultReadLibrary }) =>
                        librariesByEndpoint.getOrElse(point, () => new Set<string>()).add(defaultReadLibrary)
                    )
                })

                const omniTransactions: OmniTransaction[] = []

                logger.verbose(`Checking libraries for registration`)

                for (const [from, libraries] of librariesByEndpoint) {
                    const sdk = await createSdk(from)
                    const label = formatOmniPoint(from)

                    for (const address of libraries) {
                        const isRegistered = await sdk.isRegisteredLibrary(address)
                        logger.verbose(`Checking library ${address} for registration on ${label}`)

                        if (isRegistered) {
                            logger.verbose(`Library ${address} is already registered on ${label}`)
                            continue
                        }

                        logger.verbose(`Registering library ${address} on ${label}`)
                        omniTransactions.push(await sdk.registerLibrary(address))
                    }
                }
                return omniTransactions
            },
            {
                onStart: (logger) => logger.verbose(`Checking register libraries configuration`),
                onSuccess: (logger) => logger.verbose(`${printBoolean(true)} Checked register libraries configuration`),
                onError: (logger, _graph, error) =>
                    logger.error(`Failed to check register libraries configuration: ${error}`),
            }
        )
    )
)

export const configureEndpointV2DefaultReceiveLibraries: EndpointV2Configurator = withEndpointV2Logger(
    createConfigureEdges(
        withEndpointV2Logger(
            async ({ vector: { from, to }, config }, sdk): Promise<OmniTransaction[]> => {
                const logger = createEndpointV2Logger()
                const label = formatOmniVector({ from, to })
                const address = await sdk.getDefaultReceiveLibrary(to.eid)
                logger.verbose(`Checking default receive library for ${label}`)

                // If the library is already set as default, do nothing
                if (config.defaultReceiveLibrary === address) {
                    logger.verbose(`Default receive library is already set to ${address} for ${label}, skipping`)
                    return []
                }

                logger.info(`Setting default receive library to ${config.defaultReceiveLibrary} for ${label}`)
                return [
                    await sdk.setDefaultReceiveLibrary(
                        to.eid,
                        config.defaultReceiveLibrary,
                        config.defaultReceiveLibraryGracePeriod
                    ),
                ]
            },
            {
                onStart: (logger, [{ vector }]) =>
                    logger.verbose(`Checking default receive libraries for ${formatOmniVector(vector)}`),
                onSuccess: (logger, [{ vector }]) =>
                    logger.verbose(
                        `${printBoolean(true)} Checked default receive libraries for ${formatOmniVector(vector)}`
                    ),
                onError: (logger, [{ vector }], error) =>
                    logger.error(`Failed to check default receive libraries for ${formatOmniVector(vector)}: ${error}`),
            }
        )
    )
)

export const configureEndpointV2DefaultSendLibraries: EndpointV2Configurator = withEndpointV2Logger(
    createConfigureEdges(
        withEndpointV2Logger(
            async ({ vector: { from, to }, config }, sdk): Promise<OmniTransaction[]> => {
                const logger = createEndpointV2Logger()
                const label = formatOmniVector({ from, to })
                const address = await sdk.getDefaultSendLibrary(to.eid)
                logger.verbose(`Checking default send library for ${label}`)

                // If the library is already set as default, do nothing
                if (config.defaultSendLibrary === address) {
                    logger.verbose(`Default send library is already set to ${address} for ${label}, skipping`)
                    return []
                }

                logger.info(`Setting default send library to ${config.defaultSendLibrary} for ${label}`)
                return [await sdk.setDefaultSendLibrary(to.eid, config.defaultSendLibrary)]
            },
            {
                onStart: (logger, [{ vector }]) =>
                    logger.verbose(`Checking default send libraries for ${formatOmniVector(vector)}`),
                onSuccess: (logger, [{ vector }]) =>
                    logger.verbose(
                        `${printBoolean(true)} Checked default send libraries for ${formatOmniVector(vector)}`
                    ),
                onError: (logger, [{ vector }], error) =>
                    logger.error(`Failed to check default send libraries for ${formatOmniVector(vector)}: ${error}`),
            }
        )
    )
)

export const configureEndpointV2DefaultReadLibraries: EndpointV2Configurator = withEndpointV2Logger(
    createConfigureNodes(
        withEndpointV2Logger(
            async ({ config, point }, sdk): Promise<OmniTransaction[]> => {
                const logger = createEndpointV2Logger()
                const label = formatOmniPoint(point)
                const transactions: OmniTransaction[] = []

                if (!config?.readChannelConfigs) {
                    logger.verbose(`readChannelConfigs not defined for ${label}, skipping`)
                    return []
                }

                logger.verbose(`Checking read channels ${label}`)

                for (const { channelId, defaultReadLibrary } of config.readChannelConfigs) {
                    const sendAddress = await sdk.getDefaultSendLibrary(channelId)
                    logger.verbose(`Checking default send library for channel ${channelId} for ${label}`)

                    // If the library is already set as default, do nothing
                    if (defaultReadLibrary === sendAddress) {
                        logger.verbose(
                            `Default send library for channel ${channelId} is already set to ${defaultReadLibrary} for ${label}`
                        )
                        continue
                    } else {
                        logger.verbose(
                            `Setting default send library for channel ${channelId} to ${defaultReadLibrary} for ${label}`
                        )
                        transactions.push(await sdk.setDefaultSendLibrary(channelId, defaultReadLibrary))
                    }

                    const receiveAddress = await sdk.getDefaultReceiveLibrary(channelId)
                    logger.verbose(`Checking default receive library for channel ${channelId} for ${label}`)

                    // If the library is already set as default, do nothing
                    if (defaultReadLibrary === receiveAddress) {
                        logger.verbose(
                            `Default receive library for channel ${channelId} is already set to ${defaultReadLibrary} for ${label}`
                        )
                        continue
                    } else {
                        // TODO READ: Grace period should be configurable
                        logger.verbose(
                            `Setting default receive library for channel ${channelId} to ${defaultReadLibrary} for ${label}`
                        )
                        transactions.push(await sdk.setDefaultReceiveLibrary(channelId, defaultReadLibrary))
                    }
                }

                return transactions
            },
            {
                onStart: (logger, [{ point }]) =>
                    logger.verbose(`Checking Endpoint default read libraries for ${formatOmniPoint(point)}`),
                onSuccess: (logger, [{ point }]) =>
                    logger.verbose(
                        `${printBoolean(true)} Checked Endpoint default read libraries for ${formatOmniPoint(point)}`
                    ),
                onError: (logger, [{ point }], error) =>
                    logger.error(
                        `Failed to check Endpoint default read libraries for ${formatOmniPoint(point)}: ${error}`
                    ),
            }
        )
    )
)

export const configureEndpointV2: EndpointV2Configurator = withEndpointV2Logger(
    createConfigureMultiple(
        configureEndpointV2RegisterLibraries,
        configureEndpointV2DefaultReceiveLibraries,
        configureEndpointV2DefaultSendLibraries,
        configureEndpointV2DefaultReadLibraries
    ),
    {
        onStart: (logger) => logger.info(`Checking EndpointV2 configuration`),
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked EndpointV2 configuration`),
        onError: (logger, args, error) => logger.error(`Failed to check EndpointV2 configuration: ${error}`),
    }
)
