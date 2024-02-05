import {
    Bytes,
    flattenTransactions,
    formatOmniVector,
    isDeepEqual,
    OmniAddress,
    OmniPointMap,
    type OmniTransaction,
} from '@layerzerolabs/devtools'
import { OAppEnforcedOption, OAppEnforcedOptionParam, OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { SetConfigParam } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

export type OAppConfigurator = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OmniTransaction[]>

export const configureOApp: OAppConfigurator = async (graph: OAppOmniGraph, createSdk: OAppFactory) =>
    flattenTransactions([
        await configureOAppPeers(graph, createSdk),
        await configureSendLibraries(graph, createSdk),
        await configureReceiveLibraries(graph, createSdk),
        await configureReceiveLibraryTimeouts(graph, createSdk),
        await configureSendConfig(graph, createSdk),
        await configureReceiveConfig(graph, createSdk),
        await configureEnforcedOptions(graph, createSdk),
    ])

export const configureOAppPeers: OAppConfigurator = async (graph, createSdk) => {
    const logger = createModuleLogger('OApp')

    return flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
                logger.verbose(`Checking connection ${formatOmniVector({ from, to })}`)

                const sdk = await createSdk(from)
                const hasPeer = await sdk.hasPeer(to.eid, to.address)

                logger.verbose(`Checked connection ${formatOmniVector({ from, to })}: ${printBoolean(hasPeer)}`)
                if (hasPeer) return []

                logger.verbose(`Creating a connection ${formatOmniVector({ from, to })}`)
                return [await sdk.setPeer(to.eid, to.address)]
            })
        )
    )
}

export const configureSendLibraries: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                if (!config?.sendLibrary) return []

                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()
                const currentSendLibrary = await endpointSdk.getSendLibrary(from.address, to.eid)

                if (currentSendLibrary === config.sendLibrary) return []
                return [await endpointSdk.setSendLibrary(from.address, to.eid, config.sendLibrary)]
            })
        )
    )

export const configureReceiveLibraries: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                if (config?.receiveLibraryConfig == null) return []

                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()
                const [currentReceiveLibrary] = await endpointSdk.getReceiveLibrary(from.address, to.eid)

                if (currentReceiveLibrary === config.receiveLibraryConfig.receiveLibrary) return []
                return [
                    await endpointSdk.setReceiveLibrary(
                        from.address,
                        to.eid,
                        config.receiveLibraryConfig.receiveLibrary,
                        config.receiveLibraryConfig.gracePeriod
                    ),
                ]
            })
        )
    )

export const configureReceiveLibraryTimeouts: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                if (config?.receiveLibraryTimeoutConfig == null) return []

                const { receiveLibraryTimeoutConfig } = config
                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()
                const timeout = await endpointSdk.getReceiveLibraryTimeout(from.address, to.eid)

                if (isDeepEqual(timeout, receiveLibraryTimeoutConfig)) return []
                return [
                    await endpointSdk.setReceiveLibraryTimeout(
                        from.address,
                        to.eid,
                        receiveLibraryTimeoutConfig.lib,
                        receiveLibraryTimeoutConfig.expiry
                    ),
                ]
            })
        )
    )

export const configureSendConfig: OAppConfigurator = async (graph, createSdk) => {
    // This function builds a map to find all SetConfigParam[] to execute for a given OApp and SendLibrary
    const setConfigsByEndpointAndLibrary: OmniPointMap<Map<OmniAddress, SetConfigParam[]>> = new OmniPointMap()

    for (const {
        vector: { from, to },
        config,
    } of graph.connections) {
        if (!config?.sendConfig) continue
        const oappSdk = await createSdk(from)
        const endpointSdk = await oappSdk.getEndpointSDK()
        const currentSendLibrary = config?.sendLibrary ?? (await endpointSdk.getSendLibrary(from.address, to.eid))
        assert(
            currentSendLibrary !== undefined,
            'sendLibrary has not been set in your config and no default value exists'
        )

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

        if (!hasExecutorConfig) {
            const newSetConfigs: SetConfigParam[] = await endpointSdk.getExecutorConfigParams(currentSendLibrary, [
                { eid: to.eid, executorConfig: config.sendConfig.executorConfig },
            ])

            // Updates map with new configs for that OApp and Send Library
            const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
            const existingSetConfigs = setConfigsByLibrary.get(currentSendLibrary) ?? []
            setConfigsByEndpointAndLibrary.set(
                from,
                setConfigsByLibrary.set(currentSendLibrary, [...existingSetConfigs, ...newSetConfigs])
            )
        }

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
        }
    }

    // This function iterates over the map (OApp -> SendLibrary -> SetConfigParam[]) to execute setConfig
    return buildOmniTransactions(setConfigsByEndpointAndLibrary, createSdk)
}

export const configureReceiveConfig: OAppConfigurator = async (graph, createSdk) => {
    // This function builds a map to find all SetConfigParam[] to execute for a given OApp and ReceiveLibrary
    const setConfigsByEndpointAndLibrary: OmniPointMap<Map<OmniAddress, SetConfigParam[]>> = new OmniPointMap()
    for (const {
        vector: { from, to },
        config,
    } of graph.connections) {
        if (!config?.receiveConfig) continue
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
        if (config?.enforcedOptions == null) continue
        const oappSdk = await createSdk(from)

        // combines enforced options together by msgType
        const enforcedOptionsByType = config.enforcedOptions.reduce(
            enforcedOptionsReducer,
            new Map<ExecutorOptionType, Options>()
        )

        // We ask the oapp SDK whether this config has already been applied
        for (const [msgType, options] of enforcedOptionsByType) {
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

const enforcedOptionsReducer = (
    optionsByType: Map<ExecutorOptionType, Options>,
    optionConfig: OAppEnforcedOption
): Map<ExecutorOptionType, Options> => {
    const { msgType } = optionConfig
    const currentOptions = optionsByType.get(msgType) ?? Options.newOptions()

    switch (msgType) {
        case ExecutorOptionType.LZ_RECEIVE:
            return optionsByType.set(
                msgType,
                currentOptions.addExecutorLzReceiveOption(optionConfig.gas, optionConfig.value)
            )

        case ExecutorOptionType.NATIVE_DROP:
            return optionsByType.set(
                msgType,
                currentOptions.addExecutorNativeDropOption(optionConfig.amount, optionConfig.receiver)
            )

        case ExecutorOptionType.COMPOSE:
            return optionsByType.set(
                msgType,
                currentOptions.addExecutorComposeOption(optionConfig.index, optionConfig.gas, optionConfig.value)
            )

        case ExecutorOptionType.ORDERED:
            return optionsByType.set(msgType, currentOptions.addExecutorOrderedExecutionOption())
    }
}
