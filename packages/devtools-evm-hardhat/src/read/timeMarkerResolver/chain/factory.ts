import pMemoize from 'p-memoize'
import type { JsonRpcProvider } from '@ethersproject/providers'
import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

import { createProviderFactory } from '@/provider'
import type { ITimeMarkerResolverChainSdk } from '@/read/types'
import { EVMTimeMarkerResolverChainSdk } from '@/read/timeMarkerResolver/chain/evm'

export const createChainTimeMarkerResolverSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ITimeMarkerResolverChainSdk> =>
    pMemoize(
        async (eid) =>
            new EVMTimeMarkerResolverChainSdk({
                eid,
                provider: await providerFactory(eid),
            })
    )
