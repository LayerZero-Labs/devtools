import type {
    Configurator,
    IOmniSDK,
    OmniAddress,
    OmniGraph,
    OmniPoint,
    OmniSDKFactory,
    OmniTransaction,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

export interface ILzApp extends IOmniSDK {
    getTrustedRemote(eid: EndpointId): Promise<OmniAddress | undefined>
    hasTrustedRemote(eid: EndpointId, trustedRemote: OmniAddress | null | undefined): Promise<boolean>
    setTrustedRemote(eid: EndpointId, trustedRemote: OmniAddress | null | undefined): Promise<OmniTransaction>
}

export type LzAppOmniGraph = OmniGraph<unknown, unknown>

export type LzAppFactory<TLzApp extends ILzApp = ILzApp, TOmniPoint = OmniPoint> = OmniSDKFactory<TLzApp, TOmniPoint>

export type LzAppConfigurator<TLzApp extends ILzApp = ILzApp> = Configurator<LzAppOmniGraph, TLzApp>
