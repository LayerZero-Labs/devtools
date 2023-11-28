import type { EndpointBasedFactory } from '@/types'
import type { BaseProvider } from '@ethersproject/providers'

export type Provider = BaseProvider

export type RpcUrlFactory = EndpointBasedFactory<string>

export type ProviderFactory<TProvider extends Provider = Provider> = EndpointBasedFactory<TProvider>
