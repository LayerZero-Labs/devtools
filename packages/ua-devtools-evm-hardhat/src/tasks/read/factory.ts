import pMemoize from 'p-memoize'

import type { JsonRpcProvider } from '@ethersproject/providers'
import type { EndpointBasedFactory, Factory } from '@layerzerolabs/devtools'
import type {
    ICommandResolver,
    IComputerEVM,
    ISingleViewFunctionCallerEVM,
    ITimeMarkerResolverChain,
    ITimeMarkerResolver,
    ITimeMarkerValidatorChain,
    ITimeMarkerValidator,
} from '@layerzerolabs/ua-devtools'
import { type ProviderFactory } from '@layerzerolabs/devtools-evm'
import { createProviderFactory } from '@layerzerolabs/devtools-evm-hardhat'

import {
    ComputerEVM,
    EVMTimeMarkerResolverChain,
    EVMTimeMarkerValidatorChain,
    SingleViewFunctionCallerEVM,
} from '@layerzerolabs/ua-devtools-evm'
import { CommandResolver, TimeMarkerResolver, TimeMarkerValidator } from '@layerzerolabs/ua-devtools'

export const createSingleViewFunctionCallerEVMFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ISingleViewFunctionCallerEVM> =>
    pMemoize(async (eid) => new SingleViewFunctionCallerEVM(eid, await providerFactory(eid)))

export const createComputerEVMFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<IComputerEVM> => pMemoize(async (eid) => new ComputerEVM(eid, await providerFactory(eid)))

export const createCommandResolverFactory = (
    singleViewFunctionCallerEVMFactory: EndpointBasedFactory<ISingleViewFunctionCallerEVM> = createSingleViewFunctionCallerEVMFactory(),
    computerEVMFactory: EndpointBasedFactory<IComputerEVM> = createComputerEVMFactory()
): Factory<[], ICommandResolver> =>
    pMemoize(async () => new CommandResolver(singleViewFunctionCallerEVMFactory, computerEVMFactory))

export const createTimeMarkerResolverChainFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ITimeMarkerResolverChain> =>
    pMemoize(async (eid) => new EVMTimeMarkerResolverChain(eid, await providerFactory(eid)))

export const createTimeMarkerResolverFactory = (
    timeMarkerResolverChainFactory: EndpointBasedFactory<ITimeMarkerResolverChain> = createTimeMarkerResolverChainFactory()
): Factory<[], ITimeMarkerResolver> => pMemoize(async () => new TimeMarkerResolver(timeMarkerResolverChainFactory))

export const createTimeMarkerValidatorChainFactory = (
    providerFactory: ProviderFactory<JsonRpcProvider> = createProviderFactory()
): EndpointBasedFactory<ITimeMarkerValidatorChain> =>
    pMemoize(async (eid) => new EVMTimeMarkerValidatorChain(eid, await providerFactory(eid)))

export const createTimeMarkerValidatorFactory = (
    timeMarkerValidatorChainFactory: EndpointBasedFactory<ITimeMarkerValidatorChain> = createTimeMarkerValidatorChainFactory()
): Factory<[], ITimeMarkerValidator> => pMemoize(async () => new TimeMarkerValidator(timeMarkerValidatorChainFactory))
