import { flattenTransactions, type OmniTransaction, OmniPointMap, Bytes32 } from '@layerzerolabs/devtools'
import type { EndpointV2Configurator, IEndpointV2 } from './types'

export const configureEndpointV2: EndpointV2Configurator = async (graph, createSdk) =>
    flattenTransactions([
        await configureEndpointV2RegisterLibraries(graph, createSdk),
        await configureEndpointV2DefaultReceiveLibraries(graph, createSdk),
        await configureEndpointV2DefaultSendLibraries(graph, createSdk),
    ])

export const configureEndpointV2RegisterLibraries: EndpointV2Configurator = async (graph, createSdk) => {
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

export const configureEndpointV2DefaultReceiveLibraries: EndpointV2Configurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const address = await sdk.getDefaultReceiveLibrary(to.eid)

                // If the library is already set as default, do nothing
                if (config.defaultReceiveLibrary === address) {
                    return []
                }

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

export const configureEndpointV2DefaultSendLibraries: EndpointV2Configurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const address = await sdk.getDefaultSendLibrary(to.eid)

                // If the library is already set as default, do nothing
                if (config.defaultSendLibrary === address) {
                    return []
                }

                return [await sdk.setDefaultSendLibrary(to.eid, config.defaultSendLibrary)]
            })
        )
    )

const registerLibraries = async (sdk: IEndpointV2, libraries: string[]): Promise<OmniTransaction[]> =>
    flattenTransactions(
        await Promise.all(
            libraries.map(async (address) => {
                const isRegistered = await sdk.isRegisteredLibrary(address)

                if (isRegistered) {
                    return []
                }
                return [await sdk.registerLibrary(address)]
            })
        )
    )
