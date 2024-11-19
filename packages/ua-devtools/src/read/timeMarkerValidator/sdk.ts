import { EndpointBasedFactory } from '@layerzerolabs/devtools'
import { groupByEid, type ResolvedTimeMarker, type ResolvedTimestampTimeMarker } from '@/read'

import { ITimeMarkerValidator, ITimeMarkerValidatorChain } from './types'

export class TimeMarkerValidator implements ITimeMarkerValidator {
    constructor(protected readonly timeMarkerValidatorChainFactory: EndpointBasedFactory<ITimeMarkerValidatorChain>) {}

    public async checkResolvedTimeMarkerValidity(tms: ResolvedTimestampTimeMarker[]): Promise<void> {
        const groupedTimeMarkers = groupByEid(tms)

        await Promise.all(
            Array.from(groupedTimeMarkers.entries()).map(async ([eid, markers]) => {
                const sdk = await this.timeMarkerValidatorChainFactory(eid)
                await sdk.checkResolvedTimeMarkerValidity(markers)
            })
        )
    }

    public async assertTimeMarkerBlockConfirmations(tms: ResolvedTimeMarker[]): Promise<void> {
        const groupedTimeMarkers = groupByEid(tms)

        await Promise.all(
            Array.from(groupedTimeMarkers.entries()).map(async ([eid, markers]) => {
                const sdk = await this.timeMarkerValidatorChainFactory(eid)
                await sdk.assertTimeMarkerBlockConfirmations(markers)
            })
        )
    }
}
