import type {
    OmniAddress,
    OmniGraph,
    OmniTransaction,
    IOmniSDK,
    OmniPoint,
    OmniSDKFactory,
    Configurator,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export enum Uln302ConfigType {
    Send = 'send',
    Receive = 'receive',
}

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
     * @param {OmniAddress | null | undefined} address
     * @param {Uln302ConfigType} type
     */
    getUlnConfig(
        eid: EndpointId,
        address: OmniAddress | null | undefined,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig>

    /**
     * Gets the ULN config for a given endpoint ID and an address.
     *
     * This function will not take the default executor config into account
     * as opposed to `getUlnConfig`
     *
     * @see {@link getUlnConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {OmniAddress} address
     * @param {Uln302ConfigType} type
     */
    getAppUlnConfig(eid: EndpointId, address: OmniAddress, type: Uln302ConfigType): Promise<Uln302UlnConfig>

    /**
     * Checks whether a given `config` is set explicitly on a given OApp.
     *
     * This method makes it easy to take the specifics of a particular VM implementation
     * into account when checking for differences in ULN configuration.
     *
     * @param {EndpointId} eid
     * @param {OmniAddress} oapp
     * @param {Uln302UlnUserConfig} config
     * @param {Uln302ConfigType} type
     * @returns {Promise<boolean>} `true` if the config has been explicitly set, `false` otherwise
     */
    hasAppUlnConfig(
        eid: EndpointId,
        oapp: OmniAddress,
        config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean>

    setDefaultUlnConfig(eid: EndpointId, config: Uln302UlnUserConfig): Promise<OmniTransaction>

    /**
     * Gets the Executor config for a given endpoint ID and an address.
     *
     * If there is no executor config specified, this function will return the default
     * config set for this library and EndpointID
     *
     * @see {@link getAppExecutorConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {PossiblyBytes | null} address
     */
    getExecutorConfig(eid: EndpointId, address?: OmniAddress | null | undefined): Promise<Uln302ExecutorConfig>

    /**
     * Gets the Executor config for a given endpoint ID and an address.
     *
     * This function will not take the default executor config into account
     * as opposed to `getUlnConfig`
     *
     * @see {@link getExecutorConfig}
     *
     * @param {EndpointId} eid Endpoint ID
     * @param {PossiblyBytes} address
     */
    getAppExecutorConfig(eid: EndpointId, address: OmniAddress): Promise<Uln302ExecutorConfig>

    /**
     * Checks whether a given `config` is set explicitly on a given OApp.
     *
     * This method makes it easy to take the specifics of a particular VM implementation
     * into account when checking for differences in Executor configuration.
     *
     * @param {EndpointId} eid
     * @param {OmniAddress} oapp
     * @param {Uln302ExecutorConfig} config
     * @returns {Promise<boolean>} `true` if the config has been explicitly set, `false` otherwise
     */
    hasAppExecutorConfig(eid: EndpointId, oapp: OmniAddress, config: Uln302ExecutorConfig): Promise<boolean>

    setDefaultExecutorConfig(eid: EndpointId, config: Uln302ExecutorConfig): Promise<OmniTransaction>
}

export interface Uln302ExecutorConfig {
    maxMessageSize: number
    executor: string
}

export interface Uln302UlnConfig {
    confirmations: bigint
    optionalDVNThreshold: number
    requiredDVNs: string[]
    requiredDVNCount: number
    optionalDVNs: string[]
}

/**
 * Uln302UlnConfig interface with optional properties left out
 * for user convenience.
 */
export interface Uln302UlnUserConfig {
    confirmations?: bigint
    optionalDVNThreshold?: number
    requiredDVNs: string[]
    requiredDVNCount?: number
    optionalDVNs?: string[]
}

export interface Uln302NodeConfig {
    defaultExecutorConfigs: [eid: EndpointId, config: Uln302ExecutorConfig][]
    defaultUlnConfigs: [eid: EndpointId, config: Uln302UlnUserConfig][]
}

export type Uln302OmniGraph = OmniGraph<Uln302NodeConfig, unknown>

export type Uln302Factory<TUln302 extends IUln302 = IUln302, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TUln302,
    TOmniPoint
>

export type Uln302Configurator<TUln302 extends IUln302 = IUln302> = Configurator<Uln302OmniGraph, TUln302>
