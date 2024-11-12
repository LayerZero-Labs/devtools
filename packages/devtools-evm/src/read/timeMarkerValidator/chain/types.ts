import type { ResolvedTimeMarker, ResolvedTimestampTimeMarker } from '@/read/types'

export interface ITimeMarkerValidatorChainSdk {
    checkResolvedTimeMarkerValidity(tms: Omit<ResolvedTimestampTimeMarker, 'eid'>[]): Promise<void> // throw if wrong timestamp

    assertTimeMarkerBlockConfirmations(tms: Omit<ResolvedTimeMarker, 'eid'>[]): Promise<void> // throw if not enough confirmations
}
