import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface BaseTimeMarker {
    blockConfirmation: number
    isBlockNumber: boolean
    eid: EndpointId
    blockNumber?: number
    timestamp?: number
}

export interface BlockNumberTimeMarker extends BaseTimeMarker {
    isBlockNumber: true
    blockNumber: number
    timestamp?: never
}

export interface TimestampTimeMarker extends BaseTimeMarker {
    isBlockNumber: false
    blockNumber?: never
    timestamp: number
}

export interface ResolvedTimestampTimeMarker extends BaseTimeMarker {
    isBlockNumber: false
    blockNumber: number
    timestamp: number
}

export type TimeMarker = BlockNumberTimeMarker | TimestampTimeMarker

export type ResolvedTimeMarker = BlockNumberTimeMarker | ResolvedTimestampTimeMarker

export interface BlockTime {
    number: number
    timestamp: number
}
