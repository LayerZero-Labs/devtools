import type { OmniTransaction } from '@layerzerolabs/utils'
import type { OAppFactory, OAppOmniGraph } from './types'

export const configureOApp = async (graph: OAppOmniGraph, createSdk: OAppFactory): Promise<OmniTransaction[]> => {
    const setPeers = await Promise.all(
        graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
            const sdk = await createSdk(from)
            const hasPeer = await sdk.hasPeer(to.eid, to.address)

            if (hasPeer) return []
            return [await sdk.setPeer(to.eid, to.address)]
        })
    )

    return [...setPeers].flat()
}
