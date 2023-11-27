import type { BaseProvider } from '@ethersproject/providers'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type Provider = BaseProvider

export type EndpointBasedFactory<TValue> = (eid: EndpointId) => TValue | Promise<TValue>

export type RpcUrlFactory = EndpointBasedFactory<string>

export type ProviderFactory<TProvider extends Provider = Provider> = EndpointBasedFactory<TProvider>
