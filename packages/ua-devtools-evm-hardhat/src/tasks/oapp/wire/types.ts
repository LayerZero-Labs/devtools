import { Configurator, IOmniSDK, OmniGraph, OmniSDKFactory } from '@layerzerolabs/devtools'

export interface SubtaskConfigureTaskArgs<TOmniGraph extends OmniGraph = OmniGraph, TSDK = IOmniSDK> {
    graph: TOmniGraph
    configurator?: Configurator<TOmniGraph, TSDK>
    sdkFactory?: OmniSDKFactory<TSDK>
}
