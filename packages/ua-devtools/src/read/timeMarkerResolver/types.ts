import type { ResolvedTimestampTimeMarker, TimestampTimeMarker } from '@/read/types'

export interface ITimeMarkerResolver {
    resolveTimestampTimeMarkers(timeMarkers: TimestampTimeMarker[]): Promise<ResolvedTimestampTimeMarker[]>
}

export interface ITimeMarkerResolverChain {
    resolveTimestamps(timestamps: number[]): Promise<{ [timestamp: number]: number }>
}
