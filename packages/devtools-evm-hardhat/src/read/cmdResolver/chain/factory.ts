import pMemoize from 'p-memoize'

import type { JsonRpcProvider } from '@ethersproject/providers'
import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

import { ComputeEVMImplSdk } from '@/read/cmdResolver/chain/evm/computeImpl'
import { SingleViewFunctionEVMCallImplSdk } from '@/read/cmdResolver/chain/evm/viewImpl'
import { IComputeEVMSdk, ISingleViewFunctionEVMCallSdk } from '@/read/types'
import { createProviderFactory } from '@/provider'

export const createSingleViewFunctionEVMCallSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ISingleViewFunctionEVMCallSdk> =>
    pMemoize(async (eid) => new SingleViewFunctionEVMCallImplSdk(eid, await providerFactory(eid)))

export const createComputeEVMSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<IComputeEVMSdk> =>
    pMemoize(async (eid) => new ComputeEVMImplSdk(eid, await providerFactory(eid)))
