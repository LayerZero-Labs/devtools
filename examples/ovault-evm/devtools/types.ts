export interface TokenConfig {
    contract: string
    metadata: {
        name: string
        symbol: string
    }
    chains: number[]
    existingAddress?: string
}

export interface VaultConfig {
    eid: number
    contracts: {
        vault: string
        shareAdapter: string
        composer: string
    }
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
