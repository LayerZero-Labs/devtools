import type { EndpointV2BasedFactory } from '@layerzerolabs/devtools'
import type { BaseProvider } from '@ethersproject/providers'

export type Provider = BaseProvider

export type RpcUrlFactory = EndpointV2BasedFactory<string>

export type ProviderFactory<TProvider extends Provider = Provider> = EndpointV2BasedFactory<TProvider>
