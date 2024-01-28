import type { Address, OmniGraph, Factory, OmniTransaction, IOmniSDK, OmniPoint } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IUln302 extends IOmniSDK {
    /**
     * Gets the ULN config for a given endpoint ID and an address.
     *
     * If there is no executor config specified, this function will return the default
     * config set for this library and EndpointID
     *
     * @see {@link getAppUlnConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {Bytes32 | Address} address
     */
    getUlnConfig(eid: EndpointId, address?: Address | null | undefined): Promise<Uln302UlnConfig>

    /**
     * Gets the ULN config for a given endpoint ID and an address.
     *
     * This function will not take the default executor config into account
     * as opposed to `getUlnConfig`
     *
     * @see {@link getUlnConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {Bytes32 | Address} address
     */
    getAppUlnConfig(eid: EndpointId, address: Address): Promise<Uln302UlnConfig>

    setDefaultUlnConfig(eid: EndpointId, config: Uln302UlnConfig): Promise<OmniTransaction>

    /**
     * Gets the Executor config for a given endpoint ID and an address.
     *
     * If there is no executor config specified, this function will return the default
     * config set for this library and EndpointID
     *
     * @see {@link getAppExecutorConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {Bytes32 | Address | null} address
     */
    getExecutorConfig(eid: EndpointId, address?: Address | null | undefined): Promise<Uln302ExecutorConfig>

    /**
     * Gets the Executor config for a given endpoint ID and an address.
     *
     * This function will not take the default executor config into account
     * as opposed to `getUlnConfig`
     *
     * @see {@link getExecutorConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {Bytes32 | Address} address
     */
    getAppExecutorConfig(eid: EndpointId, address: Address): Promise<Uln302ExecutorConfig>

    setDefaultExecutorConfig(eid: EndpointId, config: Uln302ExecutorConfig): Promise<OmniTransaction>
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
