import type {
    OmniAddress,
    Factory,
    OmniGraph,
    OmniPoint,
    OmniTransaction,
    IOmniSDK,
    Bytes32,
    PossiblyBytes,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IUln302, Uln302ExecutorConfig, Uln302UlnConfig } from '@/uln302/types'

export interface IEndpoint extends IOmniSDK {
    getUln302SDK(address: OmniAddress): Promise<IUln302>

    getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined>
    setDefaultReceiveLibrary(
        eid: EndpointId,
        lib: OmniAddress | null | undefined,
        gracePeriod?: bigint
    ): Promise<OmniTransaction>

    getDefaultSendLibrary(eid: EndpointId): Promise<OmniAddress | undefined>
    setDefaultSendLibrary(eid: EndpointId, lib: OmniAddress | null | undefined): Promise<OmniTransaction>

    isRegisteredLibrary(lib: OmniAddress): Promise<boolean>
    registerLibrary(lib: OmniAddress): Promise<OmniTransaction>

    getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined>
    getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: Bytes32 | undefined, isDefault: boolean]>

    getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout>
    getReceiveLibraryTimeout(receiver: OmniAddress, srcEid: EndpointId): Promise<Timeout>

    setSendLibrary(oapp: OmniAddress, eid: EndpointId, newLib: OmniAddress): Promise<OmniTransaction>

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
        newLib: OmniAddress,
        gracePeriod: bigint
    ): Promise<OmniTransaction>
    setReceiveLibraryTimeout(
        oapp: OmniAddress,
        eid: EndpointId,
        newLib: OmniAddress,
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
     * @param {PossiblyBytes} lib Library address
     * @param {EndpointId} eid Endpoint ID
     */
    getExecutorConfig(oapp: PossiblyBytes, lib: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig>

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
     * @param {PossiblyBytes} lib Library address
     * @param {EndpointId} eid Endpoint ID
     */
    getAppExecutorConfig(oapp: PossiblyBytes, lib: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig>
    setExecutorConfig(
        oapp: PossiblyBytes,
        lib: PossiblyBytes,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction>

    /**
     * Gets the ULN config for a given OApp, library and a destination
     * endpoint ID.
     *
     * If there is no executor config specified, this function will return the default
     * config set for this library and EndpointID
     *
     * @see {@link getAppUlnConfig}
     *
     * @param {PossiblyBytes} oapp OApp address
     * @param {PossiblyBytes} lib Library address
     * @param {EndpointId} eid Endpoint ID
     */
    getUlnConfig(oapp: OmniAddress, lib: OmniAddress, eid: EndpointId): Promise<Uln302UlnConfig>

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
     * @param {PossiblyBytes} lib Library address
     * @param {EndpointId} eid Endpoint ID
     */
    getAppUlnConfig(oapp: OmniAddress, lib: OmniAddress, eid: EndpointId): Promise<Uln302UlnConfig>
    setUlnConfig(oapp: OmniAddress, lib: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<OmniTransaction>

    getUlnConfigParams(lib: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]>
    getExecutorConfigParams(lib: OmniAddress, setExecutorConfig: Uln302SetExecutorConfig[]): Promise<SetConfigParam[]>
    setConfig(oapp: OmniAddress, lib: OmniAddress, setConfigParam: SetConfigParam[]): Promise<OmniTransaction>

    quote(params: MessageParams, sender: OmniAddress): Promise<MessagingFee>
}

export type Uln302SetExecutorConfig = { eid: EndpointId; executorConfig: Uln302ExecutorConfig }
export type Uln302SetUlnConfig = { eid: EndpointId; ulnConfig: Uln302UlnConfig }

export interface SetConfigParam {
    eid: EndpointId
    configType: number
    config: string
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

export interface EndpointEdgeConfig {
    defaultReceiveLibrary: OmniAddress
    defaultReceiveLibraryGracePeriod?: bigint
    defaultSendLibrary: OmniAddress
}

export type EndpointOmniGraph = OmniGraph<unknown, EndpointEdgeConfig>

export type EndpointFactory<TEndpoint extends IEndpoint = IEndpoint, TOmniPoint = OmniPoint> = Factory<
    [TOmniPoint],
    TEndpoint
>
