import { flattenTransactions, type OmniTransaction } from '@layerzerolabs/devtools'
import { OAppEnforcedOptionConfig, OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { formatOmniVector, isDeepEqual } from '@layerzerolabs/devtools'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import type { EnforcedOptions } from '../../dist/index'

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

export const configureSendConfig: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()

                if (config?.sendConfig == null) return []

                const transactions: OmniTransaction[] = []

                const currentSendLibrary =
                    config.sendLibrary ?? (await endpointSdk.getSendLibrary(from.address, to.eid))
                assert(
                    currentSendLibrary !== undefined,
                    'sendLibrary has not been set in your config and no default value exists'
                )

                const sendExecutorConfig: Uln302ExecutorConfig = await endpointSdk.getExecutorConfig(
                    from.address,
                    currentSendLibrary,
                    to.eid
                )

                // TODO Normalize the config values using a schema before comparing them
                if (!isDeepEqual(sendExecutorConfig, config.sendConfig.executorConfig)) {
                    transactions.push(
                        await endpointSdk.setExecutorConfig(from.address, currentSendLibrary, [
                            { eid: to.eid, executorConfig: config.sendConfig.executorConfig },
                        ])
                    )
                }

                const sendUlnConfig = await endpointSdk.getUlnConfig(from.address, currentSendLibrary, to.eid)

                // TODO Normalize the config values using a schema before comparing them
                if (!isDeepEqual(sendUlnConfig, config.sendConfig.ulnConfig)) {
                    transactions.push(
                        await endpointSdk.setUlnConfig(from.address, currentSendLibrary, [
                            { eid: to.eid, ulnConfig: config.sendConfig.ulnConfig },
                        ])
                    )
                }

                return transactions
            })
        )
    )

export const configureReceiveConfig: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()
                const transactions: OmniTransaction[] = []

                if (config?.receiveConfig) {
                    const [currentReceiveLibrary] = config.receiveLibraryConfig?.receiveLibrary
                        ? [config.receiveLibraryConfig?.receiveLibrary, false]
                        : await endpointSdk.getReceiveLibrary(from.address, to.eid)
                    assert(
                        currentReceiveLibrary !== undefined,
                        'receiveLibrary has not been set in your config and no default value exists'
                    )

                    const receiveUlnConfig: Uln302UlnConfig = <Uln302UlnConfig>(
                        await endpointSdk.getUlnConfig(from.address, currentReceiveLibrary, to.eid)
                    )

                    // TODO Normalize the config values using a schema before comparing them
                    if (!isDeepEqual(receiveUlnConfig, config.receiveConfig.ulnConfig)) {
                        transactions.push(
                            await endpointSdk.setUlnConfig(from.address, currentReceiveLibrary, [
                                { eid: to.eid, ulnConfig: config.receiveConfig.ulnConfig },
                            ])
                        )
                    }
                }

                return [...transactions]
            })
        )
    )

export const configureEnforcedOptions: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const transactions: OmniTransaction[] = []

                if (config?.enforcedOptions) {
                    const enforcedOptions: EnforcedOptions[] = []
                    const enforcedOptionsConfig: OAppEnforcedOptionConfig[] = config.enforcedOptions
                    const oappSdk = await createSdk(from)
                    for (const enforcedOption of enforcedOptionsConfig) {
                        const currentEnforcedOption = await oappSdk.getEnforcedOptions(to.eid, enforcedOption.msgType)
                        const encodedEnforcedOption = oappSdk
                            .encodeEnforcedOptions(enforcedOption)
                            .toHex()
                            .toLowerCase()
                        if (currentEnforcedOption !== encodedEnforcedOption) {
                            enforcedOptions.push({
                                eid: to.eid,
                                msgType: enforcedOption.msgType,
                                options: encodedEnforcedOption,
                            })
                        }
                    }
                    if (enforcedOptions.length) {
                        transactions.push(await oappSdk.setEnforcedOptions(enforcedOptions))
                    }
                }

                return transactions
            })
        )
    )
