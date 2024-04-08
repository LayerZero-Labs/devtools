import type { OAppOmniGraph, OAppConfigurator, OAppFactory } from '@layerzerolabs/ua-devtools'

export interface SubtaskConfigureTaskArgs {
    graph: OAppOmniGraph
    configurator?: OAppConfigurator
    oappFactory?: OAppFactory
}
