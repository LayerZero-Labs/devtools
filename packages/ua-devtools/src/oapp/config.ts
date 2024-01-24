import { Address, flattenTransactions, OmniPointMap, type OmniTransaction } from '@layerzerolabs/devtools'
import { EnforcedOptions, OAppEnforcedOptionConfig, OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { formatOmniVector, isDeepEqual } from '@layerzerolabs/devtools'
import { SetConfigParam, Uln302ExecutorConfig } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
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
    const setConfigsByEndpointAndLibrary: OmniPointMap<Map<Address, SetConfigParam[]>> = new OmniPointMap()
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
        const sendExecutorConfig: Uln302ExecutorConfig = await endpointSdk.getExecutorConfig(
            from.address,
            currentSendLibrary,
            to.eid
        )
        const sendUlnConfig = await endpointSdk.getUlnConfig(from.address, currentSendLibrary, to.eid)

        if (!isDeepEqual(sendExecutorConfig, config.sendConfig.executorConfig)) {
            const newSetConfigs: SetConfigParam[] = await endpointSdk.getExecutorConfigParams(currentSendLibrary, [
                { eid: to.eid, executorConfig: config.sendConfig.executorConfig },
            ])
            const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
            const existingSetConfigs = setConfigsByLibrary.get(currentSendLibrary) ?? []
            setConfigsByEndpointAndLibrary.set(
                from,
                setConfigsByLibrary.set(currentSendLibrary, [...existingSetConfigs, ...newSetConfigs])
            )
        }

        if (!isDeepEqual(sendUlnConfig, config.sendConfig.ulnConfig)) {
            const newSetConfigs: SetConfigParam[] = await endpointSdk.getUlnConfigParams(currentSendLibrary, [
                { eid: to.eid, ulnConfig: config.sendConfig.ulnConfig },
            ])
            const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
            const existingSetConfigs = setConfigsByLibrary.get(currentSendLibrary) ?? []
            setConfigsByEndpointAndLibrary.set(
                from,
                setConfigsByLibrary.set(currentSendLibrary, [...existingSetConfigs, ...newSetConfigs])
            )
        }
    }

    return buildOmniTransactions(setConfigsByEndpointAndLibrary, createSdk)
}

export const configureReceiveConfig: OAppConfigurator = async (graph, createSdk) => {
    const setConfigsByEndpointAndLibrary: OmniPointMap<Map<Address, SetConfigParam[]>> = new OmniPointMap()
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
        const receiveUlnConfig = await endpointSdk.getUlnConfig(from.address, currentReceiveLibrary, to.eid)

        if (!isDeepEqual(receiveUlnConfig, config.receiveConfig.ulnConfig)) {
            const newSetConfigs: SetConfigParam[] = await endpointSdk.getUlnConfigParams(currentReceiveLibrary, [
                { eid: to.eid, ulnConfig: config.receiveConfig.ulnConfig },
            ])
            const setConfigsByLibrary = setConfigsByEndpointAndLibrary.getOrElse(from, () => new Map())
            const existingSetConfigs = setConfigsByLibrary.get(currentReceiveLibrary) ?? []
            setConfigsByEndpointAndLibrary.set(
                from,
                setConfigsByLibrary.set(currentReceiveLibrary, [...existingSetConfigs, ...newSetConfigs])
            )
        }
    }

    return buildOmniTransactions(setConfigsByEndpointAndLibrary, createSdk)
}

export const configureEnforcedOptions: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                if (config?.enforcedOptions == null) return []
                const enforcedOptions: EnforcedOptions[] = []
                const enforcedOptionsConfig: OAppEnforcedOptionConfig[] = config.enforcedOptions
                const oappSdk = await createSdk(from)
                for (const enforcedOption of enforcedOptionsConfig) {
                    const currentEnforcedOption = await oappSdk.getEnforcedOptions(to.eid, enforcedOption.msgType)
                    const encodedEnforcedOption = oappSdk.encodeEnforcedOptions(enforcedOption).toHex().toLowerCase()
                    if (currentEnforcedOption !== encodedEnforcedOption) {
                        enforcedOptions.push({
                            eid: to.eid,
                            msgType: enforcedOption.msgType,
                            options: encodedEnforcedOption,
                        })
                    }
                }
                if (enforcedOptions.length === 0) return []
                return [await oappSdk.setEnforcedOptions(enforcedOptions)]
            })
        )
    )

const buildOmniTransactions = async (
    setConfigsByEndpointAndLibrary: OmniPointMap<Map<Address, SetConfigParam[]>>,
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
