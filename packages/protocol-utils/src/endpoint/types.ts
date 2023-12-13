import type { Address, Factory, OmniGraph, OmniPoint, OmniTransaction, IOmniSDK, Bytes32 } from '@layerzerolabs/utils'
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

    setSendLibrary(eid: EndpointId, newLib: Address): Promise<OmniTransaction>
    setReceiveLibrary(eid: EndpointId, newLib: Address, gracePeriod: number): Promise<OmniTransaction>
    setReceiveLibraryTimeout(eid: EndpointId, newLib: Address, expiry: number): Promise<OmniTransaction>

    setConfig(lib: Address, params: SetConfigParam[]): Promise<OmniTransaction>
    getConfig(
        oapp: Address,
        lib: Address,
        eid: EndpointId,
        configType: number
    ): Promise<Uln302ExecutorConfig | Uln302UlnConfig>
}

export interface SetConfigParam {
    eid: EndpointId
    configType: number
    config: string
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
