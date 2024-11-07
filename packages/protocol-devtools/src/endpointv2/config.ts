import { flattenTransactions, type OmniTransaction, OmniPointMap, Bytes32 } from '@layerzerolabs/devtools'
import type { EndpointV2Configurator, IEndpointV2 } from './types'

export const configureEndpointV2: EndpointV2Configurator = async (graph, createSdk) =>
    flattenTransactions([
        await configureEndpointV2RegisterLibraries(graph, createSdk),
        await configureEndpointV2DefaultReceiveLibraries(graph, createSdk),
        await configureEndpointV2DefaultSendLibraries(graph, createSdk),
        await configureEndpointV2DefaultReadLibraries(graph, createSdk),
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

    graph.contracts.forEach(({ point, config }) => {
        config.readChannelConfigs?.forEach(({ defaultReadLibrary }) =>
            librariesByEndpoint.getOrElse(point, () => new Set<string>()).add(defaultReadLibrary)
        )
    })

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

export const configureEndpointV2DefaultReadLibraries: EndpointV2Configurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.contracts.map(async ({ point, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(point)

                const transactions: OmniTransaction[] = []

                for (const { channelId, defaultReadLibrary } of config.readChannelConfigs ?? []) {
                    const sendAddress = await sdk.getDefaultSendLibrary(channelId)

                    // If the library is already set as default, do nothing
                    if (defaultReadLibrary === sendAddress) {
                        continue
                    } else {
                        transactions.push(await sdk.setDefaultSendLibrary(channelId, defaultReadLibrary))
                    }

                    const receiveAddress = await sdk.getDefaultReceiveLibrary(channelId)

                    // If the library is already set as default, do nothing
                    if (defaultReadLibrary === receiveAddress) {
                        continue
                    } else {
                        // TODO READ: Grace period should be configurable
                        transactions.push(await sdk.setDefaultReceiveLibrary(channelId, defaultReadLibrary))
                    }
                }

                return transactions
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
