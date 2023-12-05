import type { Address, OmniGraph, OmniPointBasedFactory, OmniTransaction } from '@layerzerolabs/utils'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IUln302 {
    getUlnConfig(eid: EndpointId, address: Address): Promise<Uln302UlnConfig>
    setDefaultExecutorConfig(eid: EndpointId, config: Uln302ExecutorConfig): Promise<OmniTransaction>
    setDefaultUlnConfig(eid: EndpointId, config: Uln302UlnConfig): Promise<OmniTransaction>
}

export interface Uln302ExecutorConfig {
    maxMessageSize: number
    executor: string
}

export interface Uln302UlnConfig {
    confirmations: bigint | string | number
    optionalDVNThreshold: number
    requiredDVNs: string[]
    optionalDVNs: string[]
}

export interface Uln302NodeConfig {
    defaultExecutorConfigs: [eid: EndpointId, config: Uln302ExecutorConfig][]
    defaultUlnConfigs: [eid: EndpointId, config: Uln302UlnConfig][]
}

export type Uln302OmniGraph = OmniGraph<Uln302NodeConfig, unknown>

export type Uln302Factory = OmniPointBasedFactory<IUln302>
