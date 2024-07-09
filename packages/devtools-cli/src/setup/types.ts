import type { OmniSDKFactory, OmniSignerFactory } from '@layerzerolabs/devtools'

export interface CLISetup {
    createSdk: OmniSDKFactory
    createSigner: OmniSignerFactory
}
