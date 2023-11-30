import type { OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/utils'
import type { IOApp } from './types'

export type OAppFactory = (point: OmniPoint) => IOApp | Promise<IOApp>

export const configureOApp = async (
    graph: OmniGraph<unknown, unknown>,
    factory: OAppFactory
): Promise<OmniTransaction[]> => {
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
