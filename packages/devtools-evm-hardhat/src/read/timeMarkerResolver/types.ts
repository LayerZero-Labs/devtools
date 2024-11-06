import type { ResolvedTimestampTimeMarker, TimestampTimeMarker } from '@/read/types'

export interface ITimeMarkerResolverSdk {
    resolveTimestampTimeMarkers(timeMarkers: TimestampTimeMarker[]): Promise<ResolvedTimestampTimeMarker[]>
}

export * from './chain/types'
