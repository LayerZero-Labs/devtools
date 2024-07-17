import type {
    Configurator,
    Factory,
    IOmniSDK,
    OmniGraph,
    OmniSDKFactory,
    OmniSignerFactory,
} from '@layerzerolabs/devtools'

export interface CLISetup<TOmniGraph extends OmniGraph = OmniGraph<unknown, unknown>, TOmniSDK = IOmniSDK> {
    createSdk: OmniSDKFactory<TOmniSDK>
    createSigner: OmniSignerFactory
    configure?: Configurator<TOmniGraph, TOmniSDK>
    loadConfig?: Factory<[configPath: string], TOmniGraph>
}
