export interface TokenConfig {
    contract: string
    metadata: {
        name: string
        symbol: string
    }
    deploymentEids: number[]
}

export interface VaultConfig {
    eid: number
    contracts: {
        vault: string
        shareAdapter: string
        composer: string
    }
    vaultAddress?: string // Optional pre-deployed vault address
    assetOFTAddress?: string // Optional pre-deployed asset OFT address
    shareOFTAddress?: string // Optional pre-deployed Share OFT address
}

export interface DeploymentConfig {
    vault: VaultConfig
    AssetOFT: TokenConfig
    ShareOFT: TokenConfig
}

export interface DeployedContracts {
    assetOFT?: string
    shareOFT?: string
    vault?: string
    shareAdapter?: string
    composer?: string
}
