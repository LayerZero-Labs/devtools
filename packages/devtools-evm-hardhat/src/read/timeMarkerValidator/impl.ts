import { EndpointBasedFactory } from '@layerzerolabs/devtools'

import { groupByEid } from '@/read/common'
import type {
    ResolvedTimeMarker,
    ResolvedTimestampTimeMarker,
    TimeMarkerValidatorSdk,
    ITimeMarkerValidatorChainSdk,
} from '@/read/types'

export class TimeMarkerValidatorImplSdk implements TimeMarkerValidatorSdk {
    constructor(
        private options: {
            chainTimeMarkerValidatorSdkFactory: EndpointBasedFactory<ITimeMarkerValidatorChainSdk>
        }
    ) {}

    public async checkResolvedTimeMarkerValidity(tms: ResolvedTimestampTimeMarker[]): Promise<void> {
        const groupedTimeMarkers = groupByEid(tms)

        await Promise.all(
            Array.from(groupedTimeMarkers.entries()).map(async ([eid, markers]) => {
                const sdk = await this.options.chainTimeMarkerValidatorSdkFactory(eid)
                await sdk.checkResolvedTimeMarkerValidity(markers)
            })
        )
    }

    public async assertTimeMarkerBlockConfirmations(tms: ResolvedTimeMarker[]): Promise<void> {
        const groupedTimeMarkers = groupByEid(tms)

        await Promise.all(
            Array.from(groupedTimeMarkers.entries()).map(async ([eid, markers]) => {
                const sdk = await this.options.chainTimeMarkerValidatorSdkFactory(eid)
                await sdk.assertTimeMarkerBlockConfirmations(markers)
            })
        )
    }
}
