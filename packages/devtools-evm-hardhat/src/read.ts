import pMemoize from 'p-memoize'

import type { JsonRpcProvider } from '@ethersproject/providers'
import type { EndpointBasedFactory, Factory } from '@layerzerolabs/devtools'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'

import {
    CommandResolverSdk,
    ComputeEVMSdk,
    EVMTimeMarkerResolverChainSdk,
    EVMTimeMarkerValidatorChainSdk,
    SingleViewFunctionEVMCallSdk,
    TimeMarkerResolverSdk,
    TimeMarkerValidatorSdk,
} from '@layerzerolabs/devtools-evm'

import type {
    ICommandResolverSdk,
    IComputeEVMSdk,
    ISingleViewFunctionEVMCallSdk,
    ITimeMarkerResolverChainSdk,
    ITimeMarkerResolverSdk,
    ITimeMarkerValidatorChainSdk,
    ITimeMarkerValidatorSdk,
} from '@layerzerolabs/devtools-evm'

import { createProviderFactory } from '@/provider'

export const createSingleViewFunctionEVMCallSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ISingleViewFunctionEVMCallSdk> =>
    pMemoize(async (eid) => new SingleViewFunctionEVMCallSdk(eid, await providerFactory(eid)))

export const createComputeEVMSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<IComputeEVMSdk> => pMemoize(async (eid) => new ComputeEVMSdk(eid, await providerFactory(eid)))

export const createCommandResolverSdkFactory = (
    singleViewFunctionEVMCallSdkFactory: EndpointBasedFactory<ISingleViewFunctionEVMCallSdk> = createSingleViewFunctionEVMCallSdkFactory(),
    computeEVMSdkFactory: EndpointBasedFactory<IComputeEVMSdk> = createComputeEVMSdkFactory()
): Factory<[], ICommandResolverSdk> =>
    pMemoize(async () => new CommandResolverSdk({ singleViewFunctionEVMCallSdkFactory, computeEVMSdkFactory }))

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

export const createTimeMarkerResolverSdkFactory = (
    chainTimeMarkerResolverFactory: EndpointBasedFactory<ITimeMarkerResolverChainSdk> = createChainTimeMarkerResolverSdkFactory()
): Factory<[], ITimeMarkerResolverSdk> =>
    pMemoize(
        async () =>
            new TimeMarkerResolverSdk({
                chainTimeMarkerResolverSdkFactory: chainTimeMarkerResolverFactory,
            })
    )

export const createChainTimeMarkerValidatorSdkFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ITimeMarkerValidatorChainSdk> =>
    pMemoize(async (eid) => new EVMTimeMarkerValidatorChainSdk(eid, await providerFactory(eid)))

export const createTimeMarkerValidatorSdkFactory = (
    chainTimeMarkerValidatorSdkFactory: EndpointBasedFactory<ITimeMarkerValidatorChainSdk> = createChainTimeMarkerValidatorSdkFactory()
): Factory<[], ITimeMarkerValidatorSdk> =>
    pMemoize(
        async () =>
            new TimeMarkerValidatorSdk({ chainTimeMarkerValidatorSdkFactory: chainTimeMarkerValidatorSdkFactory })
    )
