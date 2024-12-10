import { EncodedOption, OAppEnforcedOptions, OAppFactory, OAppOmniGraph, OAppPeers } from '@/oapp/types'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

export type OAppCheckPeers = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OAppPeers[]>
export type OAppCheckEnforcedOptions = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OAppEnforcedOptions[]>

const EnforcedOptions: ExecutorOptionType[] = [
    ExecutorOptionType.LZ_RECEIVE,
    ExecutorOptionType.NATIVE_DROP,
    ExecutorOptionType.COMPOSE,
    ExecutorOptionType.ORDERED,
    ExecutorOptionType.LZ_READ,
]

export const checkOAppPeers: OAppCheckPeers = async (graph, createSdk): Promise<OAppPeers[]> => {
    return await Promise.all(
        graph.connections.map(async ({ vector }): Promise<OAppPeers> => {
            const sdk = await createSdk(vector.from)
            const hasPeer = await sdk.hasPeer(vector.to.eid, vector.to.address)
            return { vector: vector, hasPeer }
        })
    )
}

export const checkOAppEnforcedOptions: OAppCheckEnforcedOptions = async (
    graph,
    createSdk
): Promise<OAppEnforcedOptions[]> => {
    return await Promise.all(
        graph.connections.map(async ({ vector }): Promise<OAppEnforcedOptions> => {
            const enforcedOptionsRead: EncodedOption[] = []
            const oappSdk = await createSdk(vector.from)
            for (const enforcedOption of EnforcedOptions) {
                enforcedOptionsRead.push({
                    msgType: enforcedOption,
                    options: await oappSdk.getEnforcedOptions(vector.to.eid, enforcedOption),
                })
            }
            return { vector: vector, enforcedOptions: enforcedOptionsRead }
        })
    )
}
