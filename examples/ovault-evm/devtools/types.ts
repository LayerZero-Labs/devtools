export interface TokenConfig {
    contract: string
    metadata: {
        name: string
        symbol: string
    }
    chains: number[]
}

export interface VaultConfig {
    eid: number
    contracts: {
        vault: string
        shareAdapter: string
        composer: string
    }
    assetAddress?: string // Optional pre-deployed asset address
}

export interface DeploymentConfig {
    vault: VaultConfig
    asset: TokenConfig
    share: TokenConfig
}

export interface DeployedContracts {
    assetOFT?: string
    shareOFT?: string
    vault?: string
    shareAdapter?: string
    composer?: string
}
