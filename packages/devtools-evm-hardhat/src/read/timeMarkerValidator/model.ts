import type { ResolvedTimeMarker, ResolvedTimestampTimeMarker } from '@/read/types'

export interface TimeMarkerValidatorSdk {
    checkResolvedTimeMarkerValidity(tms: ResolvedTimestampTimeMarker[]): Promise<void> // throw if wrong timestamp

    assertTimeMarkerBlockConfirmations(tms: ResolvedTimeMarker[]): Promise<void> // throw if not enough confirmations
}

export * from './chain/types'
