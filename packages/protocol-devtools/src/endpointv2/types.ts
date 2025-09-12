import type {
    OmniAddress,
    OmniGraph,
    OmniPoint,
    OmniTransaction,
    IOmniSDK,
    Bytes32,
    PossiblyBytes,
    OmniSDKFactory,
    Configurator,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type {
    IUln302,
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@/uln302/types'
import type { IUlnRead, UlnReadUlnConfig, UlnReadUlnUserConfig } from '@/ulnRead/types'

export interface IEndpointV2 extends IOmniSDK {
    getUln302SDK(address: OmniAddress): Promise<IUln302>
    getUlnReadSDK(address: OmniAddress): Promise<IUlnRead>

    getDelegate(oapp: OmniAddress): Promise<OmniAddress | undefined>
    isDelegate(oapp: OmniAddress, delegate: OmniAddress): Promise<boolean>

    getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined>
    setDefaultReceiveLibrary(
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        gracePeriod?: bigint
    ): Promise<OmniTransaction>

    getDefaultSendLibrary(eid: EndpointId): Promise<OmniAddress | undefined>
    setDefaultSendLibrary(eid: EndpointId, uln: OmniAddress | null | undefined): Promise<OmniTransaction>

    isRegisteredLibrary(uln: OmniAddress): Promise<boolean>
    registerLibrary(uln: OmniAddress): Promise<OmniTransaction>
    isBlockedLibrary(uln: OmniAddress): Promise<boolean>

    getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined>
    getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: Bytes32 | undefined, isDefault: boolean]>

    getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout>
    getReceiveLibraryTimeout(receiver: OmniAddress, srcEid: EndpointId): Promise<Timeout>

    setSendLibrary(oapp: OmniAddress, eid: EndpointId, uln: OmniAddress): Promise<OmniTransaction>

    /**
     * Returns the default send library for a given OApp and a destination
     * endpoint ID.
     *
     * This function will not throw if passed a zero address.
     *
     * @param {OmniAddress | Bytes32} sender OmniAddress of the OApp
     * @param {EndpointId} dstEid Destination endpoint ID
     */
    isDefaultSendLibrary(sender: PossiblyBytes, dstEid: EndpointId): Promise<boolean>
    setReceiveLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress,
        gracePeriod: bigint
    ): Promise<OmniTransaction>
    setReceiveLibraryTimeout(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress,
        expiry: bigint
    ): Promise<OmniTransaction>

    /**
     * Gets the executor config for a given OApp, library and a destination
     * endpoint ID.
     *
     * If there is no executor config specified, this function will return the default
     * config set for this library and EndpointID
     *
     * @see {@link getAppExecutorConfig}
     *
     * @param {PossiblyBytes} oapp OApp address
     * @param {PossiblyBytes} uln Library address
     * @param {EndpointId} eid Endpoint ID
     */
    getExecutorConfig(oapp: PossiblyBytes, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig>

    /**
     * Gets the executor config for a given OApp, library and a destination
     * endpoint ID.
     *
     * This function will not take the default executor config into account
     * as opposed to `getExecutorConfig`
     *
     * @see {@link getExecutorConfig}
     *
     * @param {PossiblyBytes} oapp OApp address
     * @param {PossiblyBytes} uln Library address
     * @param {EndpointId} eid Endpoint ID
     */
    getAppExecutorConfig(oapp: PossiblyBytes, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig>

    /**
     * Checks whether a given `config` is set explicitly for a given OApp
     * on a particular ULN
     *
     * This method makes it easy to take the specifics of a particular VM implementation
     * into account when checking for differences in Executor configuration.
     *
     * @see {@link IUln302.hasAppExecutorConfig}
     *
     * @param {OmniAddress} oapp
     * @param {OmniAddress} uln
     * @param {EndpointId} eid
     * @param {Uln302ExecutorConfig} config
     * @returns {Promise<boolean>} `true` if the config has been explicitly set, `false` otherwise
     */
    hasAppExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302ExecutorConfig
    ): Promise<boolean>

    setExecutorConfig(
        oapp: PossiblyBytes,
        uln: PossiblyBytes,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction[]>

    /**
     * Gets the ULN config for a given OApp, library and a destination
     * endpoint ID.
     *
     * If there is no ULN config specified, this function will return the default
     * config set for this library and EndpointID
     *
     * @see {@link getAppUlnConfig}
     *
     * @param {PossiblyBytes} oapp OApp address
     * @param {PossiblyBytes} uln Library address
     * @param {EndpointId} eid Endpoint ID
     * @param {Uln302ConfigType} type
     */
    getUlnConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId, type: Uln302ConfigType): Promise<Uln302UlnConfig>

    /**
     * Gets the ULN config for a given OApp, library and a destination
     * endpoint ID.
     *
     * This function will not take the default executor config into account
     * as opposed to `getUlnConfig`
     *
     * @see {@link getUlnConfig}
     *
     * @param {PossiblyBytes} oapp OApp address
     * @param {PossiblyBytes} uln Library address
     * @param {EndpointId} eid Endpoint ID
     * @param {Uln302ConfigType} type
     */
    getAppUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig>

    /**
     * Gets the Read ULN config for a given OApp, library and a destination
     * channel ID.
     *
     * This function will not take the default configs into account
     * as opposed to `getUlnReadConfig`
     *
     * @see {@link getUlnReadConfig}
     *
     * @param {PossiblyBytes} oapp OApp address
     * @param {PossiblyBytes} uln Library address
     * @param {number} channelId Channel ID
     */
    getAppUlnReadConfig(oapp: OmniAddress, uln: OmniAddress, channelId: number): Promise<UlnReadUlnConfig>

    /**
     * Checks whether a given `config` is set explicitly for a given OApp
     * on a particular ULN
     *
     * @see {@link IUln302.hasAppUlnConfig}
     *
     * @param {OmniAddress} oapp
     * @param {OmniAddress} uln
     * @param {EndpointId} eid
     * @param {Uln302UlnUserConfig} config
     * @param {Uln302ConfigType} type
     * @returns {Promise<boolean>} `true` if the config has been explicitly set, `false` otherwise
     */
    hasAppUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean>

    /**
     * Checks whether a given `config` is set explicitly for a given OApp
     * on a particular ULN
     *
     * @see {@link IUlnRead.hasAppUlnConfig}
     *
     * @param {OmniAddress} oapp
     * @param {OmniAddress} uln
     * @param {number} channelId
     * @param {UlnReadUlnUserConfig} config
     * @returns {Promise<boolean>} `true` if the config has been explicitly set, `false` otherwise
     */
    hasAppUlnReadConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        channelId: number,
        config: UlnReadUlnUserConfig
    ): Promise<boolean>

    setUlnConfig(oapp: OmniAddress, uln: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<OmniTransaction[]>

    setUlnReadConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: UlnReadSetUlnConfig[]
    ): Promise<OmniTransaction[]>

    getUlnConfigParams(uln: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]>
    getUlnReadConfigParams(uln: OmniAddress, setUlnConfig: UlnReadSetUlnConfig[]): Promise<SetConfigParam[]>
    getExecutorConfigParams(uln: OmniAddress, setExecutorConfig: Uln302SetExecutorConfig[]): Promise<SetConfigParam[]>
    setConfig(oapp: OmniAddress, uln: OmniAddress, setConfigParam: SetConfigParam[]): Promise<OmniTransaction[]>

    quote(params: MessageParams, sender: OmniAddress): Promise<MessagingFee>
}

export interface Uln302SetExecutorConfig {
    eid: EndpointId
    executorConfig: Uln302ExecutorConfig
}

export interface Uln302SetUlnConfig {
    type: Uln302ConfigType
    eid: EndpointId
    ulnConfig: Uln302UlnUserConfig
}

export interface UlnReadSetUlnConfig {
    channelId: number
    ulnConfig: UlnReadUlnUserConfig
}

export interface SetConfigParam {
    eid: EndpointId
    configType: number
    config: unknown
}

export interface MessageParams {
    dstEid: EndpointId
    receiver: OmniAddress
    message: string | Uint8Array
    options: string | Uint8Array
    payInLzToken: boolean
}

export interface MessagingFee {
    nativeFee: bigint
    lzTokenFee: bigint
}

export interface Timeout {
    lib: string
    expiry: bigint
}

export interface EndpointV2EdgeConfig {
    defaultReceiveLibrary: OmniAddress
    defaultReceiveLibraryGracePeriod?: bigint
    defaultSendLibrary: OmniAddress
}

export interface ReadChannelConfig {
    channelId: number
    defaultReadLibrary: OmniAddress
}

export interface EndpointV2NodeConfig {
    readChannelConfigs?: ReadChannelConfig[]
}

export type EndpointV2OmniGraph = OmniGraph<EndpointV2NodeConfig | undefined, EndpointV2EdgeConfig>

export type EndpointV2Factory<TEndpointV2 extends IEndpointV2 = IEndpointV2, TOmniPoint = OmniPoint> = OmniSDKFactory<
    TEndpointV2,
    TOmniPoint
>

export type EndpointV2Configurator<TEndpointV2 extends IEndpointV2 = IEndpointV2> = Configurator<
    EndpointV2OmniGraph,
    TEndpointV2
>
