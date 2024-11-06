import pMemoize from 'p-memoize'
import type { EndpointBasedFactory, Factory } from '@layerzerolabs/devtools'

import { createChainTimeMarkerResolverSdkFactory } from '@/read/timeMarkerResolver/chain'
import { TimeMarkerResolverSdk } from '@/read/timeMarkerResolver/impl'
import type { ITimeMarkerResolverSdk, ITimeMarkerResolverChainSdk } from '@/read/types'

export const createTimeMarkerResolverSdkFactory = (
    chainTimeMarkerResolverFactory: EndpointBasedFactory<ITimeMarkerResolverChainSdk> = createChainTimeMarkerResolverSdkFactory()
): Factory<[], ITimeMarkerResolverSdk> =>
    pMemoize(
        async () =>
            new TimeMarkerResolverSdk({
                chainTimeMarkerResolverSdkFactory: chainTimeMarkerResolverFactory,
            })
    )
