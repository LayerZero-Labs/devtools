import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type TronWeb from 'tronweb'

export type TronWebFactory = EndpointBasedFactory<TronWeb>
export type PrivateKeyFactory = EndpointBasedFactory<string>
