import pMemoize from 'p-memoize'
import type { JsonRpcProvider } from '@ethersproject/providers'
import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

import { createProviderFactory } from '@/provider'
import type { ITimeMarkerValidatorChainSdk } from '@/read/types'
import { EVMTimeMarkerValidatorChainSdk } from '@/read/timeMarkerValidator/chain/evm'

export const createChainTimeMarkerValidatorSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ITimeMarkerValidatorChainSdk> =>
    pMemoize(async (eid) => new EVMTimeMarkerValidatorChainSdk(eid, await providerFactory(eid)))
