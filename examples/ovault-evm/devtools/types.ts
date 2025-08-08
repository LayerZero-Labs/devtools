export interface TokenConfig {
    contract: string
    metadata: {
        name: string
        symbol: string
    }
    chains: number[]
}

export interface HubConfig {
    eid: number
    contracts: {
        vault: string
        shareAdapter: string
        composer: string
    }
}

export interface DeploymentConfig {
    hub: HubConfig
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
