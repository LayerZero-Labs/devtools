import type {
    OmniAddress,
    OmniGraph,
    OmniTransaction,
    IOmniSDK,
    OmniPoint,
    OmniSDKFactory,
    Configurator,
} from '@layerzerolabs/devtools'

export interface IUlnRead extends IOmniSDK {
    /**
     * Gets the ULN config for a given channel ID and an address.
     *
     * If executor, requiredDVNs, and optionalDVNs are not set, the default values for the library
     * and channel ID will be returned.
     *
     * @see {@link getAppUlnConfig}
     *
     * @param {number} channelId Channel Id
     * @param {OmniAddress | null | undefined} address
     */
    getUlnConfig(channelId: number, address: OmniAddress | null | undefined): Promise<UlnReadUlnConfig>

    /**
     * Gets the ULN config for a given channel ID and an address.
     *
     * Returns only the user-configured values and doesn't take the default values into account.
     *
     * @see {@link getUlnConfig}
     *
     * @param {number} channelId Channel Id
     * @param {OmniAddress} address
     */
    getAppUlnConfig(channelId: number, address: OmniAddress): Promise<UlnReadUlnConfig>

    /**
     * Checks whether a given `config` is set explicitly on a given OApp.
     *
     * This method makes it easy to take the specifics of a particular VM implementation
     * into account when checking for differences in ULN configuration.
     *
     * @param {number} channelId
     * @param {OmniAddress} oapp
     * @param {UlnReadUlnUserConfig} config
     * @returns {Promise<boolean>} `true` if the config has been explicitly set, `false` otherwise
     */
    hasAppUlnConfig(channelId: number, oapp: OmniAddress, config: UlnReadUlnUserConfig): Promise<boolean>

    setDefaultUlnConfig(channelId: number, config: UlnReadUlnUserConfig): Promise<OmniTransaction>
}

export interface UlnReadUlnConfig {
    executor: string
    optionalDVNThreshold: number
    requiredDVNs: string[]
    optionalDVNs: string[]
}

/**
 * UlnReadUlnConfig interface with optional properties left out
 * for user convenience.
 */
export interface UlnReadUlnUserConfig {
    executor?: string
    optionalDVNThreshold?: number
    requiredDVNs: string[]
    optionalDVNs?: string[]
}

export interface UlnReadNodeConfig {
    defaultUlnConfigs: [channelId: number, config: UlnReadUlnUserConfig][]
}

export type UlnReadOmniGraph = OmniGraph<UlnReadNodeConfig, unknown>

export type UlnReadFactory<TUlnRead extends IUlnRead = IUlnRead, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TUlnRead,
    TOmniPoint
>

export type UlnReadConfigurator<TUlnRead extends IUlnRead = IUlnRead> = Configurator<UlnReadOmniGraph, TUlnRead>
