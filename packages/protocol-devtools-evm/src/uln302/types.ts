import { PossiblyBigInt } from '@layerzerolabs/devtools'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'

export interface Uln302UlnConfigInput extends Omit<Uln302UlnConfig, 'confirmations'> {
    confirmations: PossiblyBigInt
}

export interface Uln302ExecutorConfigInput extends Omit<Uln302ExecutorConfig, 'maxMessageSize'> {
    maxMessageSize: PossiblyBigInt
}
