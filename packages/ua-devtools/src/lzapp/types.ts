import type { Factory, IOmniSDK, OmniAddress, OmniGraph, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface ILzApp extends IOmniSDK {
    getTrustedRemote(eid: EndpointId): Promise<OmniAddress | undefined>
    hasTrustedRemote(eid: EndpointId, trustedRemote: OmniAddress | null | undefined): Promise<boolean>
    setTrustedRemote(eid: EndpointId, trustedRemote: OmniAddress | null | undefined): Promise<OmniTransaction>
}

export type LzAppOmniGraph = OmniGraph<unknown, unknown>

export type LzAppFactory<TLzApp extends ILzApp = ILzApp, TOmniPoint = OmniPoint> = Factory<[TOmniPoint], TLzApp>
