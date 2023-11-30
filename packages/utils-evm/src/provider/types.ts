import type { EndpointBasedFactory } from '@layerzerolabs/utils'
import type { BaseProvider } from '@ethersproject/providers'

export type Provider = BaseProvider

export type RpcUrlFactory = EndpointBasedFactory<string>

export type ProviderFactory<TProvider extends Provider = Provider> = EndpointBasedFactory<TProvider>
