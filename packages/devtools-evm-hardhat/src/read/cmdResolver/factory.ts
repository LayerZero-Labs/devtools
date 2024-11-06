import pMemoize from 'p-memoize'

import type { EndpointBasedFactory, Factory } from '@layerzerolabs/devtools'

import { createComputeEVMSdkFactory, createSingleViewFunctionEVMCallSdkFactory } from '@/read/cmdResolver/chain'
import { CommandResolverSdk } from '@/read/cmdResolver/impl'
import type { IComputeEVMSdk, ICommandResolverSdk, ISingleViewFunctionEVMCallSdk } from '@/read/types'

export const createCommandResolverSdkFactory = (
    singleViewFunctionEVMCallSdkFactory: EndpointBasedFactory<ISingleViewFunctionEVMCallSdk> = createSingleViewFunctionEVMCallSdkFactory(),
    computeEVMSdkFactory: EndpointBasedFactory<IComputeEVMSdk> = createComputeEVMSdkFactory()
): Factory<[], ICommandResolverSdk> =>
    pMemoize(async () => new CommandResolverSdk({ singleViewFunctionEVMCallSdkFactory, computeEVMSdkFactory }))
