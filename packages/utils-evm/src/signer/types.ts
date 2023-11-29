import type { EndpointBasedFactory } from '@/types'
import type { TypedDataSigner } from '@ethersproject/abstract-signer'

export type Signer = TypedDataSigner

export type SignerFactory<TProvider extends Signer = Signer> = EndpointBasedFactory<TProvider>
