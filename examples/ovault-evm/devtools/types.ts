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
    shareOFTAdapterAddress?: string // Optional pre-deployed ShareOFTAdapter address
}

export interface DeploymentConfig {
    vault: VaultConfig
    assetOFT: TokenConfig
    shareOFT: TokenConfig
}

export interface DeployedContracts {
    assetOFT?: string
    shareOFT?: string
    vault?: string
    shareAdapter?: string
    composer?: string
}
