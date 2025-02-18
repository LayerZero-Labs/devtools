import type { BigNumberish } from '@ethersproject/bignumber'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'

export interface Uln302UlnConfigInput extends Omit<Uln302UlnConfig, 'confirmations'> {
    confirmations: BigNumberish
}

export interface Uln302ExecutorConfigInput extends Omit<Uln302ExecutorConfig, 'maxMessageSize'> {
    maxMessageSize: BigNumberish
}
