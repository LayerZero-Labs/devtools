import type {
    Address,
    OmniGraph,
    OmniPointBasedFactory,
    OmniTransaction,
    IOmniSDK,
    Bytes32,
} from '@layerzerolabs/utils'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface IEndpoint extends IOmniSDK {
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
}

export interface EndpointEdgeConfig {
    defaultReceiveLibrary: Address
    defaultReceiveLibraryGracePeriod?: number
    defaultSendLibrary: Address
}

export type EndpointOmniGraph = OmniGraph<unknown, EndpointEdgeConfig>

export type EndpointFactory<TEndpoint extends IEndpoint = IEndpoint> = OmniPointBasedFactory<TEndpoint>
