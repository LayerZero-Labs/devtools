import { Address, flattenTransactions, type OmniTransaction } from '@layerzerolabs/devtools'
import type { OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { formatOmniVector } from '@layerzerolabs/devtools'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'

export type OAppConfigurator = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OmniTransaction[]>

export const configureOApp: OAppConfigurator = async (graph: OAppOmniGraph, createSdk: OAppFactory) =>
    flattenTransactions([
        await configureOAppPeers(graph, createSdk),
        await configureSendLibraries(graph, createSdk),
        await configureReceiveLibraries(graph, createSdk),
        await configureReceiveLibraryTimeouts(graph, createSdk),
        await configureOAppConfigs(graph, createSdk),
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
                if (!config?.receiveLibraryTimeoutConfig) return []
                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()
                const timeout = await endpointSdk.getReceiveLibraryTimeout(from.address, to.eid)

                if (
                    timeout.lib === config.receiveLibraryTimeoutConfig.lib &&
                    timeout.expiry === config.receiveLibraryTimeoutConfig.expiry
                )
                    return []
                return [
                    await endpointSdk.setReceiveLibraryTimeout(
                        from.address,
                        to.eid,
                        config.receiveLibraryTimeoutConfig.lib,
                        config.receiveLibraryTimeoutConfig.expiry
                    ),
                ]
            })
        )
    )

export const configureOAppConfigs: OAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const oappSdk = await createSdk(from)
                const endpointSdk = await oappSdk.getEndpointSDK()
                const transactions: OmniTransaction[] = []

                if (config?.sendConfig) {
                    const currentSendLibrary: Address = config.sendLibrary
                        ? config.sendLibrary
                        : (await endpointSdk.getSendLibrary(from.address, to.eid)) ?? ''
                    const sendExecutorConfig: Uln302ExecutorConfig = await endpointSdk.getExecutorConfig(
                        from.address,
                        currentSendLibrary,
                        to.eid
                    )

                    // 1) executor
                    // - maxMessageSize
                    // - executor
                    if (
                        sendExecutorConfig.maxMessageSize !== config.sendConfig.executorConfig.maxMessageSize ||
                        sendExecutorConfig.executor !== config.sendConfig.executorConfig.executor
                    ) {
                        transactions.push(
                            await endpointSdk.setExecutorConfig(from.address, currentSendLibrary, [
                                { eid: to.eid, executorConfig: config.sendConfig.executorConfig },
                            ])
                        )
                    }

                    // 2) uln
                    // - confirmations
                    // - optionalDVNThreshold
                    // - requiredDVNs
                    // - optionalDVNs
                    const sendUlnConfig = await endpointSdk.getUlnConfig(from.address, currentSendLibrary, to.eid)

                    if (
                        sendUlnConfig.confirmations !== config.sendConfig.ulnConfig.confirmations ||
                        sendUlnConfig.optionalDVNThreshold !== config.sendConfig.ulnConfig.optionalDVNThreshold ||
                        sendUlnConfig.requiredDVNs !== config.sendConfig.ulnConfig.requiredDVNs ||
                        sendUlnConfig.optionalDVNs !== config.sendConfig.ulnConfig.optionalDVNs
                    ) {
                        transactions.push(
                            await endpointSdk.setUlnConfig(from.address, currentSendLibrary, [
                                { eid: to.eid, ulnConfig: config.sendConfig.ulnConfig },
                            ])
                        )
                    }
                }

                if (config?.receiveConfig) {
                    const [currentReceiveLibrary] = config.receiveLibraryConfig?.receiveLibrary
                        ? [config.receiveLibraryConfig?.receiveLibrary, false]
                        : await endpointSdk.getReceiveLibrary(from.address, to.eid)
                    assert(currentReceiveLibrary !== undefined, 'currentReceiveLibrary must be defined')
                    const receiveUlnConfig: Uln302UlnConfig = <Uln302UlnConfig>(
                        await endpointSdk.getUlnConfig(from.address, currentReceiveLibrary, to.eid)
                    )
                    if (
                        receiveUlnConfig.confirmations !== config.receiveConfig.ulnConfig.confirmations ||
                        receiveUlnConfig.optionalDVNThreshold !== config.receiveConfig.ulnConfig.optionalDVNThreshold ||
                        receiveUlnConfig.requiredDVNs !== config.receiveConfig.ulnConfig.requiredDVNs ||
                        receiveUlnConfig.optionalDVNs !== config.receiveConfig.ulnConfig.optionalDVNs
                    ) {
                        transactions.push(
                            await endpointSdk.setUlnConfig(from.address, currentReceiveLibrary, [
                                { eid: to.eid, ulnConfig: config.receiveConfig.ulnConfig },
                            ])
                        )
                    }
                }

                if (!transactions.length) return []
                return [...transactions]
            })
        )
    )
