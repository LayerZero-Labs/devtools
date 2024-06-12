import {
    Bytes,
    formatOmniVector,
    isDeepEqual,
    OmniAddress,
    OmniPointMap,
    type OmniTransaction,
    formatOmniPoint,
    createConfigureMultiple,
    createConfigureNodes,
    createConfigureEdges,
} from '@layerzerolabs/devtools'
import type { OAppConfigurator, OAppEnforcedOption, OAppEnforcedOptionParam, OAppFactory } from './types'
import { createModuleLogger, createWithAsyncLogger, printBoolean } from '@layerzerolabs/io-devtools'
import type { SetConfigParam } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

const createOAppLogger = () => createModuleLogger('OApp')
const withOAppLogger = createWithAsyncLogger(createOAppLogger)

export const configureOAppDelegates: OAppConfigurator = withOAppLogger(
    createConfigureNodes(
        withOAppLogger(
            async ({ config, point }, sdk) => {
                const logger = createOAppLogger()
                const label = formatOmniPoint(point)

                // Don't do anything if delegate is not set
                if (config?.delegate == null) {
                    return logger.verbose(`Delegate not set for ${label}, skipping`), []
                }

                const isDelegate = await sdk.isDelegate(config.delegate)

                logger.verbose(`Delegate ${config.delegate} set for ${label}: ${printBoolean(isDelegate)}`)
                if (isDelegate) {
                    return logger.verbose(`Delegate ${config.delegate} already set for ${label}`), []
                }

                logger.verbose(`Setting delegate ${config.delegate} for ${label}`)
                return [await sdk.setDelegate(config.delegate)]
            },
            {
                onStart: (logger, [{ point }]) =>
                    logger.verbose(`Checking OApp delegate configuration for ${formatOmniPoint(point)}`),
                onSuccess: (logger, [{ point }]) =>
                    logger.verbose(`${printBoolean(true)} Checked OApp delegate for ${formatOmniPoint(point)}`),
                onError: (logger, [{ point }], error) =>
                    logger.error(`Failed to check OApp delegate for ${formatOmniPoint(point)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.verbose(`Checking OApp delegates configuration`),
        onSuccess: (logger) => logger.verbose(`${printBoolean(true)} Checked OApp delegates`),
    }
)

export const configureOAppPeers: OAppConfigurator = withOAppLogger(
    createConfigureEdges(
        withOAppLogger(
            async ({ vector: { from, to } }, sdk): Promise<OmniTransaction[]> => {
                const logger = createOAppLogger()

                logger.verbose(`Checking connection ${formatOmniVector({ from, to })}`)

                const hasPeer = await sdk.hasPeer(to.eid, to.address)

                logger.verbose(`Checked connection ${formatOmniVector({ from, to })}: ${printBoolean(hasPeer)}`)
                if (hasPeer) {
                    return []
                }

                logger.verbose(`Creating a connection ${formatOmniVector({ from, to })}`)
                return [await sdk.setPeer(to.eid, to.address)]
            },
            {
                onStart: (logger, [{ vector }]) =>
                    logger.verbose(`Checking OApp peers for ${formatOmniVector(vector)}`),
                onSuccess: (logger, [{ vector }]) =>
                    logger.verbose(`${printBoolean(true)} Checked OApp peers for ${formatOmniVector(vector)}`),
                onError: (logger, [{ vector }], error) =>
                    logger.error(`Failed to check OApp peers for ${formatOmniVector(vector)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.verbose(`Checking OApp peers configuration`),
        onSuccess: (logger) => logger.verbose(`${printBoolean(true)} Checked OApp peers configuration`),
    }
)

export const configureSendLibraries: OAppConfigurator = withOAppLogger(
    createConfigureEdges(
        withOAppLogger(
            async ({ vector: { from, to }, config }, sdk): Promise<OmniTransaction[]> => {
                const logger = createOAppLogger()

                if (!config?.sendLibrary) {
                    logger.verbose(`sendLibrary configuration not set for ${formatOmniVector({ from, to })}, skipping`)
                    return []
                }

                const endpointSdk = await sdk.getEndpointSDK()
                const isDefaultLibrary = await endpointSdk.isDefaultSendLibrary(from.address, to.eid)
                const currentSendLibrary = await endpointSdk.getSendLibrary(from.address, to.eid)

                if (!isDefaultLibrary && currentSendLibrary === config.sendLibrary) {
                    logger.verbose(
                        `Current sendLibrary is not default library and is already set to ${config.sendLibrary} for ${formatOmniVector({ from, to })}, skipping`
                    )
                    return []
                }

                logger.verbose(`Setting sendLibrary ${config.sendLibrary} for ${formatOmniVector({ from, to })}`)
                return [await endpointSdk.setSendLibrary(from.address, to.eid, config.sendLibrary)]
            },
            {
                onStart: (logger, [{ vector }]) =>
                    logger.verbose(`Checking send libraries for ${formatOmniVector(vector)}`),
                onSuccess: (logger, [{ vector }]) =>
                    logger.verbose(`${printBoolean(true)} Checked send libraries for ${formatOmniVector(vector)}`),
                onError: (logger, [{ vector }], error) =>
                    logger.error(`Failed to check send libraries for ${formatOmniVector(vector)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.verbose(`Checking send libraries configuration`),
        onSuccess: (logger) => logger.verbose(`${printBoolean(true)} Checked send libraries configuration`),
    }
)

export const configureReceiveLibraries: OAppConfigurator = withOAppLogger(
    createConfigureEdges(
        withOAppLogger(
            async ({ vector: { from, to }, config }, sdk): Promise<OmniTransaction[]> => {
                const logger = createOAppLogger()

                if (config?.receiveLibraryConfig == null) {
                    logger.verbose(`receiveLibraryConfig not set for ${formatOmniVector({ from, to })}, skipping`)
                    return []
                }

                const endpointSdk = await sdk.getEndpointSDK()
                const [currentReceiveLibrary, isDefaultLibrary] = await endpointSdk.getReceiveLibrary(
                    from.address,
                    to.eid
                )

                if (!isDefaultLibrary && currentReceiveLibrary === config.receiveLibraryConfig.receiveLibrary) {
                    logger.verbose(
                        `Current recieveLibrary is not default and is already set to ${config.receiveLibraryConfig.receiveLibrary} for ${formatOmniVector({ from, to })}, skipping`
                    )
                    return []
                }

                logger.verbose(
                    `Setting recieveLibrary ${config.receiveLibraryConfig.receiveLibrary} for ${formatOmniVector({ from, to })}`
                )

                return [
                    await endpointSdk.setReceiveLibrary(
                        from.address,
                        to.eid,
                        config.receiveLibraryConfig.receiveLibrary,
                        config.receiveLibraryConfig.gracePeriod
                    ),
                ]
            },
            {
                onStart: (logger, [{ vector }]) =>
                    logger.verbose(`Checking receive libraries for ${formatOmniVector(vector)}`),
                onSuccess: (logger, [{ vector }]) =>
                    logger.verbose(`${printBoolean(true)} Checked receive libraries for ${formatOmniVector(vector)}`),
                onError: (logger, [{ vector }], error) =>
                    logger.error(`Failed to check receive libraries for ${formatOmniVector(vector)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.verbose(`Checking receive libraries configuration`),
        onSuccess: (logger) => logger.verbose(`${printBoolean(true)} Checked receive libraries configuration`),
    }
)

export const configureReceiveLibraryTimeouts: OAppConfigurator = withOAppLogger(
    createConfigureEdges(
        withOAppLogger(
            async ({ vector: { from, to }, config }, sdk): Promise<OmniTransaction[]> => {
                const logger = createOAppLogger()

                if (config?.receiveLibraryTimeoutConfig == null) {
                    logger.verbose(
                        `receiveLibraryTimeoutConfig not set for ${formatOmniVector({ from, to })}, skipping`
                    )
                    return []
                }

                const { receiveLibraryTimeoutConfig } = config
                const endpointSdk = await sdk.getEndpointSDK()
                const timeout = await endpointSdk.getReceiveLibraryTimeout(from.address, to.eid)

                if (isDeepEqual(timeout, receiveLibraryTimeoutConfig)) {
                    logger.verbose(
                        `Current timeout for ${receiveLibraryTimeoutConfig.lib} is already set to ${receiveLibraryTimeoutConfig.expiry} for ${formatOmniVector({ from, to })}, skipping`
                    )
                    return []
                }

                logger.verbose(
                    `Setting timeout for ${receiveLibraryTimeoutConfig.lib} to ${receiveLibraryTimeoutConfig.expiry} for ${formatOmniVector({ from, to })}`
                )

                return [
                    await endpointSdk.setReceiveLibraryTimeout(
                        from.address,
                        to.eid,
                        receiveLibraryTimeoutConfig.lib,
                        receiveLibraryTimeoutConfig.expiry
                    ),
                ]
            },
            {
                onStart: (logger, [{ vector }]) =>
                    logger.verbose(`Checking receive library timeouts for ${formatOmniVector(vector)}`),
                onSuccess: (logger, [{ vector }]) =>
                    logger.verbose(
                        `${printBoolean(true)} Checked receive library timeouts for ${formatOmniVector(vector)}`
                    ),
                onError: (logger, [{ vector }], error) =>
                    logger.error(`Failed to check receive library timeouts for ${formatOmniVector(vector)}: ${error}`),
            }
        )
    ),
    {
        onStart: (logger) => logger.verbose(`Checking receive library timeout configuration`),
        onSuccess: (logger) => logger.verbose(`${printBoolean(true)} Checked receive library timeout configuration`),
    }
)

export const configureSendConfig: OAppConfigurator = withOAppLogger(
    async (graph, createSdk) => {
        const logger = createOAppLogger()

        // This function builds a map to find all SetConfigParam[] to execute for a given OApp and SendLibrary
        const setConfigsByEndpointAndLibrary: OmniPointMap<Map<OmniAddress, SetConfigParam[]>> = new OmniPointMap()

        for (const {
            vector: { from, to },
            config,
        } of graph.connections) {
            if (config?.sendConfig?.executorConfig == null && config?.sendConfig?.ulnConfig == null) {
                logger.verbose(`executorConfig and ulnConfig not set for ${formatOmniVector({ from, to })}, skipping`)
                continue
            }

            const oappSdk = await createSdk(from)
            const endpointSdk = await oappSdk.getEndpointSDK()
            const currentSendLibrary = config.sendLibrary ?? (await endpointSdk.getSendLibrary(from.address, to.eid))
            assert(
                currentSendLibrary !== undefined,
                'sendLibrary has not been set in your config and no default value exists'
            )

            if (config.sendConfig.executorConfig != null) {
                // We ask the endpoint SDK whether this config has already been applied
                //
                // We need to ask not for the final config formed of the default config and the app config,
                // we only need to check the app config
                const hasExecutorConfig = await endpointSdk.hasAppExecutorConfig(
                    from.address,
                    currentSendLibrary,
                    to.eid,
                    config.sendConfig.executorConfig
                )

                logger.verbose(
                    `Checked executor configuration for ${formatOmniVector({ from, to })}: ${printBoolean(hasExecutorConfig)}`
                )

                if (!hasExecutorConfig) {
                    const newSetConfigs: SetConfigParam[] = await endpointSdk.getExecutorConfigParams(
                        currentSendLibrary,
                        [{ eid: to.eid, executorConfig: config.sendConfig.executorConfig }]
                    )

                    // Updates map with nw configs for that OApp and Send Library
                    const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
                    const existingSetConfigs = setConfigsByLibrary.get(currentSendLibrary) ?? []
                    setConfigsByEndpointAndLibrary.set(
                        from,
                        setConfigsByLibrary.set(currentSendLibrary, [...existingSetConfigs, ...newSetConfigs])
                    )

                    const updatedConfigList =
                        setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map()).get(currentSendLibrary) ?? []
                    const updatedConfigListCsv = updatedConfigList
                        .map(
                            (setConfigParam) =>
                                '{configType: ' + setConfigParam.configType + ', config: setConfigParam.config}'
                        )
                        .join(', ')
                    logger.verbose(
                        `Set executor configuration ${updatedConfigListCsv} for ${formatOmniVector({ from, to })}`
                    )
                }
            }

            if (config.sendConfig.ulnConfig != null) {
                // We ask the endpoint SDK whether this config has already been applied
                //
                // We need to ask not for the final config formed of the default config and the app config,
                // we only need to check the app config
                const hasUlnConfig = await endpointSdk.hasAppUlnConfig(
                    from.address,
                    currentSendLibrary,
                    to.eid,
                    config.sendConfig.ulnConfig
                )

                logger.verbose(
                    `Checked Uln configuration for ${formatOmniVector({ from, to })}: ${printBoolean(hasUlnConfig)}`
                )

                if (!hasUlnConfig) {
                    const newSetConfigs: SetConfigParam[] = await endpointSdk.getUlnConfigParams(currentSendLibrary, [
                        { eid: to.eid, ulnConfig: config.sendConfig.ulnConfig },
                    ])

                    // Updates map with new configs for that OApp and Send Library
                    const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
                    const existingSetConfigs = setConfigsByLibrary.get(currentSendLibrary) ?? []
                    setConfigsByEndpointAndLibrary.set(
                        from,
                        setConfigsByLibrary.set(currentSendLibrary, [...existingSetConfigs, ...newSetConfigs])
                    )

                    const updatedConfigList =
                        setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map()).get(currentSendLibrary) ?? []
                    const updatedConfigListCsv = updatedConfigList
                        .map(
                            (setConfigParam) =>
                                '{configType: ' + setConfigParam.configType + ', config: setConfigParam.config}'
                        )
                        .join(', ')
                    logger.verbose(
                        `Set Uln configuration ${updatedConfigListCsv} for ${formatOmniVector({ from, to })}`
                    )
                }
            }
        }

        // This function iterates over the map (OApp -> SendLibrary -> SetConfigParam[]) to execute setConfig
        return buildOmniTransactions(setConfigsByEndpointAndLibrary, createSdk)
    },
    {
        onStart: (logger) => logger.info(`Checking send configuration`), // TODO just checking if info will make it appear in tests vs verbose
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked send configuration`),
    }
)

export const configureReceiveConfig: OAppConfigurator = async (graph, createSdk) => {
    // This function builds a map to find all SetConfigParam[] to execute for a given OApp and ReceiveLibrary
    const setConfigsByEndpointAndLibrary: OmniPointMap<Map<OmniAddress, SetConfigParam[]>> = new OmniPointMap()
    for (const {
        vector: { from, to },
        config,
    } of graph.connections) {
        if (config?.receiveConfig?.ulnConfig == null) {
            continue
        }

        const oappSdk = await createSdk(from)
        const endpointSdk = await oappSdk.getEndpointSDK()
        const [currentReceiveLibrary] = config?.receiveLibraryConfig?.receiveLibrary
            ? [config.receiveLibraryConfig?.receiveLibrary, false]
            : await endpointSdk.getReceiveLibrary(from.address, to.eid)
        assert(
            currentReceiveLibrary !== undefined,
            'receiveLibrary has not been set in your config and no default value exists'
        )

        // We ask the endpoint SDK whether this config has already been applied
        //
        // We need to ask not for the final config formed of the default config and the app config,
        // we only need to check the app config
        const hasUlnConfig = await endpointSdk.hasAppUlnConfig(
            from.address,
            currentReceiveLibrary,
            to.eid,
            config.receiveConfig.ulnConfig
        )

        if (!hasUlnConfig) {
            const newSetConfigs: SetConfigParam[] = await endpointSdk.getUlnConfigParams(currentReceiveLibrary, [
                { eid: to.eid, ulnConfig: config.receiveConfig.ulnConfig },
            ])

            // Updates map with new configs for that OApp and Receive Library
            const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
            const existingSetConfigs = setConfigsByLibrary.get(currentReceiveLibrary) ?? []
            setConfigsByEndpointAndLibrary.set(
                from,
                setConfigsByLibrary.set(currentReceiveLibrary, [...existingSetConfigs, ...newSetConfigs])
            )
        }
    }

    // This function iterates over the map (OApp -> ReceiveLibrary -> SetConfigParam[]) to execute setConfig
    return buildOmniTransactions(setConfigsByEndpointAndLibrary, createSdk)
}

export const configureEnforcedOptions: OAppConfigurator = async (graph, createSdk) => {
    // This function builds a map to find all OAppEnforcedOptionParam[] to execute for a given OApp
    const setEnforcedOptionsByEndpoint: OmniPointMap<OAppEnforcedOptionParam[]> = new OmniPointMap()

    for (const {
        vector: { from, to },
        config,
    } of graph.connections) {
        if (config?.enforcedOptions == null) {
            continue
        }
        const oappSdk = await createSdk(from)

        // combines enforced options together by msgType
        const enforcedOptionsByMsgType = config.enforcedOptions.reduce(
            enforcedOptionsReducer,
            new Map<number, Options>()
        )

        // We ask the oapp SDK whether this config has already been applied
        for (const [msgType, options] of enforcedOptionsByMsgType) {
            const currentEnforcedOption: Bytes = await oappSdk.getEnforcedOptions(to.eid, msgType)
            if (currentEnforcedOption !== options.toHex()) {
                // Updates map with new configs for that OApp and OAppEnforcedOptionParam[]
                const setConfigsByLibrary = setEnforcedOptionsByEndpoint.getOrElse(from, () => [])
                setConfigsByLibrary.push({
                    eid: to.eid,
                    option: {
                        msgType,
                        options: options.toHex(),
                    },
                })
                setEnforcedOptionsByEndpoint.set(from, setConfigsByLibrary)
            }
        }
    }

    // This function iterates over the map (OApp -> OAppEnforcedOptionParam[]) to execute setEnforcedOptions
    return buildEnforcedOptionsOmniTransactions(setEnforcedOptionsByEndpoint, createSdk)
}

const buildOmniTransactions = async (
    setConfigsByEndpointAndLibrary: OmniPointMap<Map<OmniAddress, SetConfigParam[]>>,
    createSdk: OAppFactory
): Promise<OmniTransaction[]> => {
    const omniTransaction: OmniTransaction[] = []
    for (const [from, configsByLibrary] of setConfigsByEndpointAndLibrary) {
        const oapp = await createSdk(from)
        const endpoint = await oapp.getEndpointSDK()
        for (const [library, setConfigParams] of configsByLibrary) {
            omniTransaction.push(await endpoint.setConfig(from.address, library, setConfigParams))
        }
    }
    return omniTransaction
}

const buildEnforcedOptionsOmniTransactions = async (
    setEnforcedOptionsByEndpoint: OmniPointMap<OAppEnforcedOptionParam[]>,
    createSdk: OAppFactory
): Promise<OmniTransaction[]> => {
    const omniTransaction: OmniTransaction[] = []
    for (const [from, enforcedOptionsConfig] of setEnforcedOptionsByEndpoint) {
        const oappSdk = await createSdk(from)
        omniTransaction.push(await oappSdk.setEnforcedOptions(enforcedOptionsConfig))
    }
    return omniTransaction
}

/**
 * Reduces enforced options based on passed in enforced option configuration.
 * @param {Map<number, Options>} enforcedOptionsByMsgType - The map of enforced options by message type.
 * @param {OAppEnforcedOption} enforcedOptionsConfig - The passed in enforced option configuration.
 * @returns {Map<number, Options>} The reduced map of enforced options by message type.
 */
const enforcedOptionsReducer = (
    enforcedOptionsByMsgType: Map<number, Options>,
    enforcedOptionsConfig: OAppEnforcedOption
): Map<number, Options> => {
    /**
     * optionType - ExecutorOptionType (LZ_RECEIVE, NATIVE_DROP, COMPOSE, ORDERED)
     * msgType - OApp defined msgType
     */
    const { optionType, msgType } = enforcedOptionsConfig
    const currentOptions = enforcedOptionsByMsgType.get(msgType) ?? Options.newOptions()

    switch (optionType) {
        case ExecutorOptionType.LZ_RECEIVE:
            return enforcedOptionsByMsgType.set(
                msgType,
                currentOptions.addExecutorLzReceiveOption(enforcedOptionsConfig.gas, enforcedOptionsConfig.value)
            )

        case ExecutorOptionType.NATIVE_DROP:
            return enforcedOptionsByMsgType.set(
                msgType,
                currentOptions.addExecutorNativeDropOption(enforcedOptionsConfig.amount, enforcedOptionsConfig.receiver)
            )

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
    }
}

export const configureOApp: OAppConfigurator = withOAppLogger(
    createConfigureMultiple(
        configureOAppPeers,
        configureSendLibraries,
        configureReceiveLibraries,
        configureReceiveLibraryTimeouts,
        configureSendConfig,
        configureReceiveConfig,
        configureEnforcedOptions,
        configureOAppDelegates
    ),
    {
        onStart: (logger) => logger.info(`Checking OApp configuration`),
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked OApp configuration`),
        onError: (logger, args, error) => logger.error(`Failed to check OApp configuration: ${error}`),
    }
)
