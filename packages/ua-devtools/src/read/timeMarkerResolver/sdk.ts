import { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { ResolvedTimestampTimeMarker, TimestampTimeMarker } from '@/read'

import type { ITimeMarkerResolver, ITimeMarkerResolverChain } from './types'

export class TimeMarkerResolver implements ITimeMarkerResolver {
    constructor(protected readonly timeMarkerResolverChainFactory: EndpointBasedFactory<ITimeMarkerResolverChain>) {}

    public async resolveTimestampTimeMarkers(
        timeMarkers: TimestampTimeMarker[]
    ): Promise<ResolvedTimestampTimeMarker[]> {
        const resolvedTimeMarkers: ResolvedTimestampTimeMarker[] = []

        // Grouping by chainName (keeping ordering)
        const groupedTimeMarkers = timeMarkers.reduce((acc, timeMarker, id) => {
            if (!acc.has(timeMarker.eid)) {
                acc.set(timeMarker.eid, [])
            }
            acc.get(timeMarker.eid)!.push({ timeMarker, id })
            return acc
        }, new Map<number, { timeMarker: TimestampTimeMarker; id: number }[]>())

        // Process each group of timeMarkers for each chain
        await Promise.all(
            Array.from(groupedTimeMarkers.entries()).map(async ([eid, markers]) => {
                const sdk = await this.timeMarkerResolverChainFactory(eid)

                // Resolving timestamps to blockNumbers
                const timestamps = markers
                    .map((m) => m.timeMarker)
                    .filter((timeMarker) => !timeMarker.isBlockNumber)
                    .map((timeMarker) => timeMarker.timestamp)

                const resolvedTimestamps = await sdk.resolveTimestamps(timestamps)

                // putting back the item in the right order
                markers.forEach((marker) => {
                    resolvedTimeMarkers[marker.id] = {
                        ...marker.timeMarker,
                        blockNumber: resolvedTimestamps[marker.timeMarker.timestamp]!,
                    }
                })
            })
        )

        return resolvedTimeMarkers
    }
}
