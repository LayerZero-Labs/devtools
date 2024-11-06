import type { BlockNumberTimeMarker, ResolvedTimestampTimeMarker, TimestampTimeMarker } from '@/read/types'

export interface ICommandResolverSdk {
    extractTimeMarkers(command: string): Promise<{
        blockNumberTimeMarkers: BlockNumberTimeMarker[]
        timestampTimeMarkers: TimestampTimeMarker[]
    }>

    resolveCmd(command: string, timeMarkers: ResolvedTimestampTimeMarker[]): Promise<string>
}

export * from './chain/types'
