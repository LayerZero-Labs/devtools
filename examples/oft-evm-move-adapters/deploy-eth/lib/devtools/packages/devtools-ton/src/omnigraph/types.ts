import { EndpointBasedFactory } from '@layerzerolabs/devtools'
import { TonClient } from '@ton/ton'

export type TonClientFactory = EndpointBasedFactory<TonClient>
