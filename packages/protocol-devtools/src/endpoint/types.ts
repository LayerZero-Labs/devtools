import type {
    Address,
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
    getUln302SDK(address: Address): Promise<IUln302>

    getDefaultReceiveLibrary(eid: EndpointId): Promise<Address | undefined>
    setDefaultReceiveLibrary(
        eid: EndpointId,
        lib: Address | null | undefined,
        gracePeriod?: number
    ): Promise<OmniTransaction>

    getDefaultSendLibrary(eid: EndpointId): Promise<Address | undefined>
    setDefaultSendLibrary(eid: EndpointId, lib: Address | null | undefined): Promise<OmniTransaction>

    isRegisteredLibrary(lib: Address): Promise<boolean>
    registerLibrary(lib: Address): Promise<OmniTransaction>

    getSendLibrary(sender: Address, dstEid: EndpointId): Promise<Address | undefined>
    getReceiveLibrary(
        receiver: Address,
        srcEid: EndpointId
    ): Promise<[address: Bytes32 | undefined, isDefault: boolean]>

    getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout>
    getReceiveLibraryTimeout(receiver: Address, srcEid: EndpointId): Promise<Timeout>

    setSendLibrary(oapp: Address, eid: EndpointId, newLib: Address): Promise<OmniTransaction>

    /**
     * Returns the default send library for a given OApp and a destination
     * endpoint ID.
     *
     * This function will not throw if passed a zero address.
     *
     * @param {Address | Bytes32} sender Address of the OApp
     * @param {EndpointId} dstEid Destination endpoint ID
     */
    isDefaultSendLibrary(sender: PossiblyBytes, dstEid: EndpointId): Promise<boolean>
    setReceiveLibrary(oapp: Address, eid: EndpointId, newLib: Address, gracePeriod: number): Promise<OmniTransaction>
    setReceiveLibraryTimeout(oapp: Address, eid: EndpointId, newLib: Address, expiry: number): Promise<OmniTransaction>

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
    getExecutorConfig(oapp: PossiblyBytes, lib: Address, eid: EndpointId): Promise<Uln302ExecutorConfig>

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
    getAppExecutorConfig(oapp: PossiblyBytes, lib: Address, eid: EndpointId): Promise<Uln302ExecutorConfig>
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
    getUlnConfig(oapp: Address, lib: Address, eid: EndpointId): Promise<Uln302UlnConfig>

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
    getAppUlnConfig(oapp: Address, lib: Address, eid: EndpointId): Promise<Uln302UlnConfig>
    setUlnConfig(oapp: Address, lib: Address, setUlnConfig: Uln302SetUlnConfig[]): Promise<OmniTransaction>

    getUlnConfigParams(lib: Address, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]>
    getExecutorConfigParams(lib: Address, setExecutorConfig: Uln302SetExecutorConfig[]): Promise<SetConfigParam[]>
    setConfig(oapp: Address, lib: Address, setConfigParam: SetConfigParam[]): Promise<OmniTransaction>

    quote(params: MessageParams, sender: Address): Promise<MessagingFee>
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
    receiver: Address
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
    expiry: number
}

export interface EndpointEdgeConfig {
    defaultReceiveLibrary: Address
    defaultReceiveLibraryGracePeriod?: number
    defaultSendLibrary: Address
}

export type EndpointOmniGraph = OmniGraph<unknown, EndpointEdgeConfig>

export type EndpointFactory<TEndpoint extends IEndpoint = IEndpoint, TOmniPoint = OmniPoint> = Factory<
    [TOmniPoint],
    TEndpoint
>
