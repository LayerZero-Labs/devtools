import type { ResolvedTimeMarker, ResolvedTimestampTimeMarker } from '@/read/types'

export interface ITimeMarkerValidator {
    checkResolvedTimeMarkerValidity(tms: ResolvedTimestampTimeMarker[]): Promise<void> // throw if wrong timestamp

    assertTimeMarkerBlockConfirmations(tms: ResolvedTimeMarker[]): Promise<void> // throw if not enough confirmations
}

export interface ITimeMarkerValidatorChain {
    checkResolvedTimeMarkerValidity(tms: Omit<ResolvedTimestampTimeMarker, 'eid'>[]): Promise<void> // throw if wrong timestamp

    assertTimeMarkerBlockConfirmations(tms: Omit<ResolvedTimeMarker, 'eid'>[]): Promise<void> // throw if not enough confirmations
}
