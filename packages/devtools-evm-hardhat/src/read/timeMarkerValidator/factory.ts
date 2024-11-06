import pMemoize from 'p-memoize'
import { EndpointBasedFactory, Factory } from '@layerzerolabs/devtools'

import type { ITimeMarkerValidatorChainSdk, TimeMarkerValidatorSdk } from '@/read/types'
import { createChainTimeMarkerValidatorSdkFactory } from '@/read/timeMarkerValidator'
import { TimeMarkerValidatorImplSdk } from '@/read/timeMarkerValidator/impl'

export const createTimeMarkerValidatorSdkFactory = (
    chainTimeMarkerValidatorSdkFactory: EndpointBasedFactory<ITimeMarkerValidatorChainSdk> = createChainTimeMarkerValidatorSdkFactory()
): Factory<[], TimeMarkerValidatorSdk> =>
    pMemoize(
        async () =>
            new TimeMarkerValidatorImplSdk({ chainTimeMarkerValidatorSdkFactory: chainTimeMarkerValidatorSdkFactory })
    )
