import {
    type Bytes,
    type OmniTransaction,
    formatOmniPoint,
    createConfigureMultiple,
    createConfigureNodes,
} from '@layerzerolabs/devtools'
import type { OAppReadConfigurator, OAppReadEnforcedOption } from './types'
import { createModuleLogger, createWithAsyncLogger, printBoolean } from '@layerzerolabs/io-devtools'
import type { SetConfigParam } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'
import {
    configureCallerBpsCap,
    configureEnforcedOptions,
    configureOAppDelegates,
    configureOAppPeers,
    configureReceiveConfig,
    configureReceiveLibraries,
    configureReceiveLibraryTimeouts,
    configureSendConfig,
    configureSendLibraries,
    type OAppEnforcedOptionParam,
} from '@/oapp'

const createOAppReadLogger = () => createModuleLogger('OAppRead')
const withOAppReadLogger = createWithAsyncLogger(createOAppReadLogger)

export const configureOAppReadChannels: OAppReadConfigurator = withOAppReadLogger(
    createConfigureNodes(
        withOAppReadLogger(
            async ({ config, point }, sdk): Promise<OmniTransaction[]> => {
                const logger = createOAppReadLogger()
                const label = formatOmniPoint(point)

                const omniTransactions: OmniTransaction[] = []

                if (!config?.readChannelConfigs) {
                    logger.verbose(`readChannel configuration not set for ${label}, skipping`)
                    return []
                }

                logger.verbose(`Checking read channels ${label}`)

                for (const { channelId, active: activeConfig } of config.readChannelConfigs) {
                    // Default active to true
                    const active = activeConfig ?? true
                    const isActive = await sdk.isReadChannelActive(channelId)
                    logger.verbose(`Checking read channel ${channelId} for ${label}: ${printBoolean(isActive)}`)

                    if (isActive !== active) {
                        logger.verbose(`Setting read channel ${channelId} to ${active}`)
                        omniTransactions.push(await sdk.setReadChannel(channelId, active))
                    }
                }

                return omniTransactions
            },
            {
                onStart: (logger, [{ point }]) =>
                    logger.verbose(`Checking OApp read channels for ${formatOmniPoint(point)}`),
                onSuccess: (logger, [{ point }]) =>
                    logger.verbose(`${printBoolean(true)} Checked OApp read channels for ${formatOmniPoint(point)}`),
                onError: (logger, [{ point }], error) =>
                    logger.error(`Failed to check OApp read channels for ${formatOmniPoint(point)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.info(`Checking OApp read channels configuration`),
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked OApp read channels configuration`),
    }
)

export const configureReadLibraries: OAppReadConfigurator = withOAppReadLogger(
    createConfigureNodes(
        withOAppReadLogger(
            async ({ config, point }, sdk): Promise<OmniTransaction[]> => {
                const logger = createOAppReadLogger()
                const label = formatOmniPoint(point)

                if (!config?.readChannelConfigs) {
                    logger.verbose(`readChannel configuration not set for ${label}, skipping`)
                    return []
                }

                const omniTransactions: OmniTransaction[] = []

                const endpointSdk = await sdk.getEndpointSDK()

                for (const { channelId, active, readLibrary } of config.readChannelConfigs) {
                    if (active === false) {
                        logger.verbose(
                            `readLibrary won't be set for inactive channelId ${channelId} for ${label}, skipping`
                        )
                        continue
                    }

                    if (!readLibrary) {
                        logger.verbose(
                            `readLibrary configuration not set for channelId ${channelId} for ${label}, skipping`
                        )
                        continue
                    }

                    const isDefaultSendLibrary = await endpointSdk.isDefaultSendLibrary(point.address, channelId)
                    const currentSendLibrary = await endpointSdk.getSendLibrary(point.address, channelId)

                    if (!isDefaultSendLibrary && currentSendLibrary === readLibrary) {
                        logger.verbose(
                            `Current sendlibrary of channelId ${channelId} is already set to ${readLibrary} for ${label}, skipping`
                        )
                    } else {
                        logger.verbose(`Setting sendLibrary ${readLibrary} to channelId ${channelId} for ${label}`)
                        omniTransactions.push(await endpointSdk.setSendLibrary(point.address, channelId, readLibrary))
                    }

                    const [currentReceiveLibrary, isDefaultReceiveLibrary] = await endpointSdk.getReceiveLibrary(
                        point.address,
                        channelId
                    )

                    if (!isDefaultReceiveLibrary && currentReceiveLibrary === readLibrary) {
                        logger.verbose(
                            `Current receiveLibrary of channelId ${channelId} is already set to ${readLibrary} for ${label}, skipping`
                        )
                    } else {
                        logger.verbose(`Setting receiveLibrary ${readLibrary} to channelId ${channelId} for ${label}`)
                        omniTransactions.push(
                            await endpointSdk.setReceiveLibrary(
                                point.address,
                                channelId,
                                readLibrary,
                                // TODO READ: Grace period should be configurable
                                BigInt(0)
                            )
                        )
                    }
                }

                return omniTransactions
            },
            {
                onStart: (logger, [{ point }]) =>
                    logger.verbose(`Checking read libraries for ${formatOmniPoint(point)}`),
                onSuccess: (logger, [{ point }]) =>
                    logger.verbose(`${printBoolean(true)} Checked read libraries for ${formatOmniPoint(point)}`),
                onError: (logger, [{ point }], error) =>
                    logger.error(`Failed to check read libraries for ${formatOmniPoint(point)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.info(`Checking read libraries configuration`),
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked read libraries configuration`),
    }
)

export const configureReadConfig: OAppReadConfigurator = createConfigureNodes(
    withOAppReadLogger(
        async ({ config, point }, sdk): Promise<OmniTransaction[]> => {
            const logger = createOAppReadLogger()

            const label = formatOmniPoint(point)

            if (!config?.readChannelConfigs) {
                logger.verbose(`readChannel configuration not set for ${label}, skipping`)
                return []
            }

            const endpointSdk = await sdk.getEndpointSDK()

            const omniTransactions: OmniTransaction[] = []

            for (const { channelId, active, readLibrary, ulnConfig } of config.readChannelConfigs) {
                if (active === false) {
                    logger.verbose(`readLibrary not set for inactive channelId ${channelId} for ${label}, skipping`)
                    continue
                }

                if (!ulnConfig) {
                    logger.verbose(`ulnConfig not set for channelId ${channelId} for ${label}, skipping`)
                    continue
                }

                // We ask the endpoint SDK whether this config has already been applied
                //
                // We need to ask not for the final config formed of the default config and the app config,
                // we only need to check the app config

                const currentSendLibrary = readLibrary ?? (await endpointSdk.getSendLibrary(point.address, channelId))
                assert(
                    currentSendLibrary !== undefined,
                    'sendLibrary has not been set in your config and no default value exists'
                )

                const hasUlnConfig = await endpointSdk.hasAppUlnReadConfig(
                    point.address,
                    currentSendLibrary,
                    channelId,
                    ulnConfig
                )

                logger.verbose(`Checked ULN configuration for ${label}: ${printBoolean(hasUlnConfig)}`)

                if (!hasUlnConfig) {
                    const newSetConfigs: SetConfigParam[] = await endpointSdk.getUlnReadConfigParams(
                        currentSendLibrary,
                        [
                            {
                                channelId: channelId,
                                ulnConfig: ulnConfig,
                            },
                        ]
                    )

                    // Updates map with new configs for that OApp and Send Library
                    const transactions = await endpointSdk.setConfig(point.address, currentSendLibrary, newSetConfigs)

                    logger.verbose(`Set ULN configuration  for ${formatOmniPoint(point)}`)

                    const updatedConfigListCsv = newSetConfigs
                        .map(({ configType, config }) => `{configType: ${configType}, config: ${config}}`)
                        .join(', ')
                    logger.verbose(`Set ULN configuration ${updatedConfigListCsv} for ${label}`)
                    omniTransactions.push(...transactions)
                }
            }

            return omniTransactions
        },
        {
            onStart: (logger) => logger.info(`Checking read configuration`),
            onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked read configuration`),
        }
    )
)

export const configureReadEnforcedOptions: OAppReadConfigurator = createConfigureNodes(
    withOAppReadLogger(
        async ({ config, point }, sdk): Promise<OmniTransaction[]> => {
            const logger = createOAppReadLogger()

            const label = formatOmniPoint(point)

            if (!config?.readChannelConfigs) {
                logger.verbose(`readChannel configuration not set for ${label}, skipping`)
                return []
            }

            const omniTransactions: OmniTransaction[] = []

            const oappEnforcedOptions: OAppEnforcedOptionParam[] = []

            for (const { channelId, active, enforcedOptions } of config.readChannelConfigs) {
                if (active === false) {
                    logger.verbose(`readLibrary not set for inactive channelId ${channelId} for ${label}, skipping`)
                    continue
                }

                if (!enforcedOptions) {
                    logger.verbose(`Enforced options not set for channelId ${channelId} for ${label}, skipping`)
                    continue
                }

                // combines enforced options together by msgType
                const enforcedOptionsByMsgType = enforcedOptions.reduce(
                    enforcedOptionsReducer,
                    new Map<number, Options>()
                )

                // We ask the oapp SDK whether this config has already been applied
                for (const [msgType, options] of enforcedOptionsByMsgType) {
                    const currentEnforcedOption: Bytes = await sdk.getEnforcedOptions(channelId, msgType)
                    logger.verbose(
                        `Checked current enforced options for channelId ${channelId} for ${label}: ${currentEnforcedOption}`
                    )

                    if (currentEnforcedOption !== options.toHex()) {
                        oappEnforcedOptions.push({
                            eid: channelId,
                            option: {
                                msgType,
                                options: options.toHex(),
                            },
                        })

                        logger.verbose(
                            `Set enforced options {msgType: ${msgType}, options: ${options}} for channelId ${channelId} for ${label}`
                        )
                    }
                }
            }

            if (oappEnforcedOptions.length > 0) {
                logger.verbose(`Set enforced options for ${label}`)
                omniTransactions.push(await sdk.setEnforcedOptions(oappEnforcedOptions))
            }
            return omniTransactions
        },
        {
            onStart: (logger) => logger.info(`Checking enforced options`),
            onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked enforced options`),
        }
    )
)

/**
 * Reduces enforced options based on passed in enforced option configuration.
 * @param {Map<number, Options>} enforcedOptionsByMsgType - The map of enforced options by message type.
 * @param {OAppReadEnforcedOption} enforcedOptionsConfig - The passed in enforced option configuration.
 * @returns {Map<number, Options>} The reduced map of enforced options by message type.
 */
const enforcedOptionsReducer = (
    enforcedOptionsByMsgType: Map<number, Options>,
    enforcedOptionsConfig: OAppReadEnforcedOption
): Map<number, Options> => {
    /**
     * optionType - ExecutorOptionType (LZ_READ, COMPOSE, ORDERED)
     * msgType - OApp defined msgType
     */
    const { optionType, msgType } = enforcedOptionsConfig
    const currentOptions = enforcedOptionsByMsgType.get(msgType) ?? Options.newOptions()

    switch (optionType) {
        case ExecutorOptionType.COMPOSE:
            return enforcedOptionsByMsgType.set(
                msgType,
                currentOptions.addExecutorComposeOption(
                    enforcedOptionsConfig.index,
                    enforcedOptionsConfig.gas,
                    enforcedOptionsConfig.value
                )
            )

        case ExecutorOptionType.ORDERED:
            return enforcedOptionsByMsgType.set(msgType, currentOptions.addExecutorOrderedExecutionOption())

        case ExecutorOptionType.LZ_READ:
            return enforcedOptionsByMsgType.set(
                msgType,
                currentOptions.addExecutorLzReadOption(
                    enforcedOptionsConfig.gas,
                    enforcedOptionsConfig.size,
                    enforcedOptionsConfig.value
                )
            )
    }
}

export const configureOAppRead: OAppReadConfigurator = withOAppReadLogger(
    createConfigureMultiple(
        configureOAppDelegates as OAppReadConfigurator,
        configureOAppPeers as OAppReadConfigurator,
        configureOAppReadChannels,
        configureSendLibraries as OAppReadConfigurator,
        configureReceiveLibraries as OAppReadConfigurator,
        configureReceiveLibraryTimeouts as OAppReadConfigurator,
        configureReadLibraries,
        configureSendConfig as OAppReadConfigurator,
        configureReceiveConfig as OAppReadConfigurator,
        configureReadConfig,
        configureEnforcedOptions as OAppReadConfigurator,
        configureReadEnforcedOptions,
        configureCallerBpsCap as OAppReadConfigurator
    ),
    {
        onStart: (logger) => logger.info(`Checking OApp Read configuration`),
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked OApp Read configuration`),
        onError: (logger, args, error) => logger.error(`Failed to check OApp Read configuration: ${error}`),
    }
)
