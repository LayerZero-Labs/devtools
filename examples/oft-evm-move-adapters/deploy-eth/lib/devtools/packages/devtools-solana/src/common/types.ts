import type { Factory, OmniPoint } from '@layerzerolabs/devtools'
import type { PublicKey } from '@solana/web3.js'

export type PublicKeyFactory = Factory<[OmniPoint], PublicKey>
