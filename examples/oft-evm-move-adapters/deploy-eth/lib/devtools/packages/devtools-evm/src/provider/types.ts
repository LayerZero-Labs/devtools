import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { BaseProvider } from '@ethersproject/providers'

export type Provider = BaseProvider

/**
 * @deprecated Please use `RpcUrlFactory` from `@layerzerolabs/devtools`
 */
export type { RpcUrlFactory } from '@layerzerolabs/devtools'

export type ProviderFactory<TProvider extends Provider = Provider> = EndpointBasedFactory<TProvider>
