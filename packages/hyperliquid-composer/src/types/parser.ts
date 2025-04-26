export interface CoreSpotMetaData {
    name: string
    szDecimals: number
    weiDecimals: number
    index: number
    tokenId: string
    isCanonical: boolean
    evmContract: null | {
        address: string
        evm_extra_wei_decimals: number
    }
    fullName: string | null
    deployerTradingFeeShare: string
}

export interface TxData {
    from: string
    txHash: string
    nonce: number
    weiDiff: number
    assetBridgeAddress: string
    connected: boolean
}

export interface UserGenesis {
    userAndWei: Array<{
        address: string
        wei: string
    }>
    existingTokenAndWei: Array<{
        token: number
        wei: string
    }>
    blacklistUsers: string[]
}

export interface CoreSpotDeployment {
    coreSpot: CoreSpotMetaData
    txData: TxData
    userGenesis: UserGenesis
}

export interface SpotMeta {
    tokens: CoreSpotMetaData[]
}
