import type { OmniTransaction } from '@layerzerolabs/utils'
import type { OAppFactory, OAppOmniGraph } from './types'

export const configureOApp = async (graph: OAppOmniGraph, factory: OAppFactory): Promise<OmniTransaction[]> => {
    const setPeers = await Promise.all(
        graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
            const instance = await factory(from)
            const address = await instance.peers(to.eid)

            if (to.address === address) return []
            return [await instance.setPeer(to.eid, to.address)]
        })
    )

    return [...setPeers].flat()
}
