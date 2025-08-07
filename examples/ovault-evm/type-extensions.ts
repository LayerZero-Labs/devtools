import 'hardhat/types/config'

export interface TokenConfig {
    name: string
    symbol: string
}

export interface OVaultConfig {
    /**
     * Whether this chain is the hub chain where the vault is deployed
     */
    isHubChain: boolean
    /**
     * Asset token configuration (name and symbol)
     */
    assetToken: TokenConfig
    /**
     * Share token configuration (name and symbol)
     */
    shareToken: TokenConfig
}

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        ovault?: never
    }

    interface HardhatNetworkConfig {
        ovault?: never
    }

    interface HttpNetworkUserConfig {
        ovault?: OVaultConfig
    }

    interface HttpNetworkConfig {
        ovault?: OVaultConfig
    }
}
