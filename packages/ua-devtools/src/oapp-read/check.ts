import { OAppReadFactory, OAppReadOmniGraph, OAppReadChannels } from '@/oapp-read/types'

export type OAppCheckReadChannels = (
    graph: OAppReadOmniGraph,
    createSdk: OAppReadFactory
) => Promise<OAppReadChannels[]>

export const checkOAppReadChannels: OAppCheckReadChannels = async (graph, createSdk) => {
    const promises = graph.contracts.flatMap(({ point, config }) => {
        return (config?.readChannelConfigs || []).map(async ({ channelId }) => {
            const sdk = await createSdk(point)
            const isActive = await sdk.isReadChannelActive(channelId)
            return { contract: point, channelId, isActive }
        })
    })

    return await Promise.all(promises)
}
