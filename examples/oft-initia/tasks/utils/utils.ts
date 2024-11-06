import { MnemonicKey } from '@initia/initia.js'
import { LzInitiaConfig } from '@layerzerolabs/lz-initia-cli'

interface ModuleConfig {
    modulePath: string
    addresses: Record<string, string>
    deployer?: Record<string, MnemonicKey>
}

export function addModule(config: LzInitiaConfig, moduleName: string, moduleConfig: ModuleConfig) {
    config.modules[moduleName] = moduleConfig
    return config
}
