import { flattenTransactions, type OmniTransaction } from '@layerzerolabs/devtools'
import type { EndpointFactory, EndpointOmniGraph } from './types'

export type EndpointConfigurator = (graph: EndpointOmniGraph, createSdk: EndpointFactory) => Promise<OmniTransaction[]>

export const configureEndpoint: EndpointConfigurator = async (graph, createSdk) =>
    flattenTransactions([
        await configureEndpointDefaultReceiveLibraries(graph, createSdk),
        await configureEndpointDefaultSendLibraries(graph, createSdk),
    ])

export const configureEndpointDefaultReceiveLibraries: EndpointConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const address = await sdk.getDefaultReceiveLibrary(to.eid)

                // If the library is already set as default, do nothing
                if (config.defaultReceiveLibrary === address) return []

                // We need to check whether the library has been registered before we set is as default
                const isRegistered = await sdk.isRegisteredLibrary(config.defaultReceiveLibrary)

                return flattenTransactions([
                    // We only want to register the library if it has not been registered yet
                    isRegistered ? undefined : await sdk.registerLibrary(config.defaultReceiveLibrary),
                    await sdk.setDefaultReceiveLibrary(
                        to.eid,
                        config.defaultReceiveLibrary,
                        config.defaultReceiveLibraryGracePeriod
                    ),
                ])
            })
        )
    )

export const configureEndpointDefaultSendLibraries: EndpointConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const address = await sdk.getDefaultSendLibrary(to.eid)

                // If the library is already set as default, do nothing
                if (config.defaultSendLibrary === address) return []

                // We need to check whether the library has been registered before we set is as default
                const isRegistered = await sdk.isRegisteredLibrary(config.defaultSendLibrary)

                return flattenTransactions([
                    // We only want to register the library if it has not been registered yet
                    isRegistered ? undefined : await sdk.registerLibrary(config.defaultSendLibrary),
                    await sdk.setDefaultSendLibrary(to.eid, config.defaultSendLibrary),
                ])
            })
        )
    )
