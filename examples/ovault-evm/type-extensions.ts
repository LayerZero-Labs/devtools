import { NetworkConfig } from 'hardhat/types/config'

export interface TokenConfig {
    name: string
    symbol: string
}

export interface OVaultConfig {
    /**
     * Whether this chain is the hub chain where the vault is deployed
     */
    isHubChain?: boolean
    /**
     * Asset token configuration (name and symbol) - only required for asset OFT deployment
     */
    assetToken?: TokenConfig
    /**
     * Share token configuration (name and symbol) - only required for share OFT/vault deployment
     */
    shareToken?: TokenConfig
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

export type NetworkConfigOvaultExtension = NetworkConfig & {
    ovault?: OVaultConfig
}
