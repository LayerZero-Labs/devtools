import { flattenTransactions, type OmniTransaction, OmniPointMap, Bytes32 } from '@layerzerolabs/devtools'
import type { EndpointFactory, EndpointOmniGraph, IEndpoint } from './types'

export type EndpointConfigurator = (graph: EndpointOmniGraph, createSdk: EndpointFactory) => Promise<OmniTransaction[]>

export const configureEndpoint: EndpointConfigurator = async (graph, createSdk) =>
    flattenTransactions([
        await configureEndpointRegisterLibraries(graph, createSdk),
        await configureEndpointDefaultReceiveLibraries(graph, createSdk),
        await configureEndpointDefaultSendLibraries(graph, createSdk),
    ])

export const configureEndpointRegisterLibraries: EndpointConfigurator = async (graph, createSdk) => {
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

    return flattenTransactions(
        await Promise.all(
            Array.from(librariesByEndpoint).map(async ([from, libraries]) => {
                const sdk = await createSdk(from)

                return registerLibraries(sdk, Array.from(libraries))
            })
        )
    )
}

export const configureEndpointDefaultReceiveLibraries: EndpointConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const address = await sdk.getDefaultReceiveLibrary(to.eid)

                // If the library is already set as default, do nothing
                if (config.defaultReceiveLibrary === address) return []

                return [
                    await sdk.setDefaultReceiveLibrary(
                        to.eid,
                        config.defaultReceiveLibrary,
                        config.defaultReceiveLibraryGracePeriod
                    ),
                ]
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

                return [await sdk.setDefaultSendLibrary(to.eid, config.defaultSendLibrary)]
            })
        )
    )

const registerLibraries = async (sdk: IEndpoint, libraries: string[]): Promise<OmniTransaction[]> =>
    flattenTransactions(
        await Promise.all(
            libraries.map(async (address) => {
                const isRegistered = await sdk.isRegisteredLibrary(address)

                if (isRegistered) return []
                return [await sdk.registerLibrary(address)]
            })
        )
    )
