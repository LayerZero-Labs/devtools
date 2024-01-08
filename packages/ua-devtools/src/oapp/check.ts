import { OAppFactory, OAppOmniGraph, OAppPeers } from '@/oapp/types'

export type OAppRead = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OAppPeers[]>

export const checkOAppPeers: OAppRead = async (graph, createSdk): Promise<OAppPeers[]> => {
    return await Promise.all(
        graph.connections.map(async ({ vector }): Promise<OAppPeers> => {
            const sdk = await createSdk(vector.from)
            const hasPeer = await sdk.hasPeer(vector.to.eid, vector.to.address)
            return { vector: vector, hasPeer }
        })
    )
}
