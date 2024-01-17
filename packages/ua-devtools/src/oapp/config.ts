import { flattenTransactions, OmniPoint, type OmniTransaction } from '@layerzerolabs/devtools'
import { EnforcedOptions, OAppEnforcedOptionConfig, OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { formatOmniVector, isDeepEqual } from '@layerzerolabs/devtools'
import { SetConfigs, SetConfigParam, Uln302ExecutorConfig } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
export type OAppConfigurator = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OmniTransaction[]>

export const configureOApp: OAppConfigurator = async (graph: OAppOmniGraph, createSdk: OAppFactory) => {
    return flattenTransactions([
        await configureOAppPeers(graph, createSdk),
        await configureSendLibraries(graph, createSdk),
        await configureReceiveLibraries(graph, createSdk),
        await configureReceiveLibraryTimeouts(graph, createSdk),
        await configureSendConfig(graph, createSdk),
        await configureReceiveConfig(graph, createSdk),
        await configureEnforcedOptions(graph, createSdk),
    ])
}

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
    const setConfigs: SetConfigs = {}
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
            const setExecutorConfig: SetConfigParam[] = await endpointSdk.getExecutorConfigParams(currentSendLibrary, [
                { eid: to.eid, executorConfig: config.sendConfig.executorConfig },
            ])
            addConfig(setConfigs, from, currentSendLibrary, setExecutorConfig)
        }

        if (!isDeepEqual(sendUlnConfig, config.sendConfig.ulnConfig)) {
            const setUlnConfig: SetConfigParam[] = await endpointSdk.getUlnConfigParams(currentSendLibrary, [
                { eid: to.eid, ulnConfig: config.sendConfig.ulnConfig },
            ])
            addConfig(setConfigs, from, currentSendLibrary, setUlnConfig)
        }
    }

    return buildOmniTransactions(setConfigs, createSdk)
}

export const configureReceiveConfig: OAppConfigurator = async (graph, createSdk) => {
    const setConfigs: SetConfigs = {}
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
            const setUlnConfig: SetConfigParam[] = await endpointSdk.getUlnConfigParams(currentReceiveLibrary, [
                { eid: to.eid, ulnConfig: config.receiveConfig.ulnConfig },
            ])
            addConfig(setConfigs, from, currentReceiveLibrary, setUlnConfig)
        }
    }

    return buildOmniTransactions(setConfigs, createSdk)
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

const addConfig = (setConfigs: SetConfigs, from: OmniPoint, library: string, config: SetConfigParam[]) => {
    if (!setConfigs[from.eid]) {
        setConfigs[from.eid] = {}
    }

    if (!setConfigs[from.eid][library]) {
        setConfigs[from.eid][library] = {
            oappAddress: from.address,
            fromOmniPoint: from,
            config: [],
        }
    }

    setConfigs[from.eid][library].config.push(...config)
}

const buildOmniTransactions = async (setConfigs: SetConfigs, createSdk: OAppFactory): Promise<OmniTransaction[]> => {
    const omniTransaction: OmniTransaction[] = []
    for (const fromId of Object.keys(setConfigs)) {
        const innerObject = setConfigs?.[fromId]
        if (!innerObject) continue
        for (const library of Object.keys(innerObject)) {
            const setConfigParam = innerObject[library]
            if (!setConfigParam) continue
            const oappSdk = await createSdk(setConfigParam.fromOmniPoint)
            const endpointSdk = await oappSdk.getEndpointSDK()
            omniTransaction.push(
                await endpointSdk.setConfig(setConfigParam.oappAddress, library, setConfigParam.config)
            )
        }
    }
    return omniTransaction
}
