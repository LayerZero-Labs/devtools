import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { Provider as BaseProvider } from 'ethers'

export type Provider = BaseProvider

export type RpcUrlFactory = EndpointBasedFactory<string>

export type ProviderFactory<TProvider extends Provider = Provider> = EndpointBasedFactory<TProvider>
