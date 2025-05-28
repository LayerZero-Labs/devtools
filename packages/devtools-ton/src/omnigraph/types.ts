import { EndpointBasedFactory } from '@layerzerolabs/devtools'
import { TonClient, TonClient3 } from '@ton/ton'

export type TonClientFactory = EndpointBasedFactory<TonClient>
export type TonClient3Factory = EndpointBasedFactory<TonClient3>
export type TonApiFactory = EndpointBasedFactory<string>
