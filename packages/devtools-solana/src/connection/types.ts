import type { EndpointBasedFactory } from '@layerzerolabs/devtools'
import type { Connection } from '@solana/web3.js'

export type ConnectionFactory = EndpointBasedFactory<Connection>
