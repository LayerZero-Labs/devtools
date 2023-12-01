import type { EndpointFactory, EndpointOmniGraph } from './types'
import type { OmniTransaction } from '@/transactions/types'

export const configureEndpoint = async (
    graph: EndpointOmniGraph,
    factory: EndpointFactory
): Promise<OmniTransaction[]> => {
    const setDefaultSendLibraries = await Promise.all(
        graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
            const instance = await factory(from)
            const address = await instance.defaultSendLibrary(to.eid)

            if (config.defaultSendLibrary === address) return []
            return [await instance.setDefaultSendLibrary(to.eid, config.defaultSendLibrary)]
        })
    )

    return [...setDefaultSendLibraries].flat()
}
