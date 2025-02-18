import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface LibraryTimeoutResponse {
    expiry: bigint
    lib: string
}

export interface IEndpoint {
    getDefaultSendLibrary(eid: EndpointId): Promise<string>
    getSendLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]>
    getReceiveLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]>
    getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<LibraryTimeoutResponse>
    getReceiveLibraryTimeout(oftAddress: string, dstEid: number): Promise<LibraryTimeoutResponse>
    getDefaultReceiveLibrary(eid: EndpointId): Promise<string>
    getConfig(oAppAddress: string, msgLibAddress: string, eid: EndpointId, configType: number): Promise<Uint8Array>
}
