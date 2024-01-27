import type { Address, OmniGraph, Factory, OmniTransaction, IOmniSDK, OmniPoint } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IUln302 extends IOmniSDK {
    getUlnConfig(eid: EndpointId, address?: Address | null | undefined): Promise<Uln302UlnConfig>
    getAppUlnConfig(eid: EndpointId, address: Address): Promise<Uln302UlnConfig>
    getExecutorConfig(eid: EndpointId, address?: Address | null | undefined): Promise<Uln302ExecutorConfig>
    getAppExecutorConfig(eid: EndpointId, address: Address): Promise<Uln302ExecutorConfig>
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
    requiredDVNCount?: number
    optionalDVNCount?: number
}

export interface Uln302NodeConfig {
    defaultExecutorConfigs: [eid: EndpointId, config: Uln302ExecutorConfig][]
    defaultUlnConfigs: [eid: EndpointId, config: Uln302UlnConfig][]
}

export type Uln302OmniGraph = OmniGraph<Uln302NodeConfig, unknown>

export type Uln302Factory<TUln302 extends IUln302 = IUln302, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TUln302>
