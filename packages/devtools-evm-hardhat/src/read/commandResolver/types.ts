import type { BlockNumberTimeMarker, ResolvedTimestampTimeMarker, TimestampTimeMarker } from '@/read/types'
import type { Command } from '@layerzerolabs/lz-v2-utilities'

export interface ICommandResolverSdk {
    decodeCommand(command: string): Command

    extractTimeMarkers(command: string): Promise<{
        blockNumberTimeMarkers: BlockNumberTimeMarker[]
        timestampTimeMarkers: TimestampTimeMarker[]
    }>

    resolveCommand(command: string, timeMarkers: ResolvedTimestampTimeMarker[]): Promise<string>
}

export * from './chain/types'
